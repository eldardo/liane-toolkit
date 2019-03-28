import { Promise } from "meteor/promise";
import axios from "axios";
import { JobsHelpers } from "/imports/api/jobs/server/jobsHelpers.js";
import { People, PeopleLists } from "/imports/api/facebook/people/people.js";
import { Random } from "meteor/random";
import { uniqBy, groupBy, mapKeys, flatten, get, set, cloneDeep } from "lodash";
import crypto from "crypto";
import fs from "fs";

const googleMapsKey = Meteor.settings.googleMaps;

const PeopleHelpers = {
  getFormId({ personId, generate }) {
    const person = People.findOne(personId);
    if (!person) {
      throw new Meteor.Error(404, "Person not found");
    }
    if (generate || !person.formId) {
      return this.generateFormId({ person });
    } else {
      return person.formId;
    }
  },
  generateFormId({ person }) {
    const formId = crypto
      .createHash("sha1")
      .update(person._id + new Date().getTime())
      .digest("hex")
      .substr(0, 7);
    People.update(person._id, { $set: { formId } });
    return formId;
  },
  geocode({ address }) {
    let str = "";
    if (address.country) {
      str = address.country + " " + str;
    }
    if (address.zipcode) {
      str = address.zipcode + " " + str;
    }
    if (address.region) {
      str = address.region + " " + str;
    }
    if (address.city) {
      str = address.city + " " + str;
    }
    if (address.neighbourhood) {
      str = address.neighbourhood + " " + str;
    }
    if (address.street) {
      if (address.number) {
        str = address.number + " " + str;
      }
      str = address.street + " " + str;
    }
    return new Promise((resolve, reject) => {
      if (str && Object.keys(address).length > 1 && googleMapsKey) {
        axios
          .get("https://maps.googleapis.com/maps/api/geocode/json", {
            params: {
              address: str,
              key: googleMapsKey
            }
          })
          .then(res => {
            if (res.data.results && res.data.results.length) {
              const data = res.data.results[0];
              resolve({
                formattedAddress: data.formatted_address,
                coordinates: [
                  data.geometry.location.lat,
                  data.geometry.location.lng
                ]
              });
            } else {
              reject();
            }
          })
          .catch(err => {
            reject(err);
          });
      } else {
        reject();
      }
    });
  },
  updateFBUsers({ campaignId, facebookAccountId }) {
    const collection = People.rawCollection();
    const data = Promise.await(
      collection
        .aggregate([
          {
            $match: {
              facebookAccounts: { $in: [facebookAccountId] }
            }
          },
          {
            $group: {
              _id: "$facebookId",
              name: { $first: "$name" },
              counts: { $first: `$counts.${facebookAccountId}` }
            }
          },
          {
            $project: {
              _id: null,
              facebookId: "$_id",
              name: "$name",
              [`counts.${facebookAccountId}`]: "$counts"
            }
          }
        ])
        .toArray()
    );

    if (data.length) {
      const peopleBulk = collection.initializeUnorderedBulkOp();
      for (const person of data) {
        peopleBulk
          .find({
            campaignId,
            facebookId: person.facebookId
          })
          .upsert()
          .update({
            $setOnInsert: {
              _id: Random.id(),
              createdAt: person.createdAt
            },
            $set: {
              name: person.name,
              [`counts.${facebookAccountId}`]: person.counts[facebookAccountId]
            },
            $addToSet: {
              facebookAccounts: facebookAccountId
            }
          });
      }
      peopleBulk.execute();
    }
  },
  import({ campaignId, config, filename, data, defaultValues }) {
    let importData = [];

    const listId = PeopleLists.insert({ name: filename, campaignId });

    // Build default person
    let defaultPerson = {
      $set: {
        campaignId
      },
      $addToSet: {}
    };

    if (defaultValues) {
      if (defaultValues.tags && defaultValues.tags.length) {
        defaultPerson.$set["campaignMeta.basic_info.tags"] = defaultValues.tags;
      }
      if (defaultValues.labels) {
        for (let key in defaultValues.labels) {
          if (defaultValues.labels[key]) {
            defaultPerson.$set[`campaignMeta.${key}`] = true;
          }
        }
      }
    }

    // Add data
    data.forEach(function(item) {
      let obj = cloneDeep(defaultPerson);
      let customFields = [];
      for (let key in item) {
        const itemConfig = config[key];
        if (itemConfig && itemConfig.value) {
          let modelKey = itemConfig.value;
          if (modelKey !== "skip") {
            if (modelKey == "custom") {
              customFields.push({
                key: itemConfig.customField,
                val: item[key]
              });
            } else {
              obj.$set[modelKey] = item[key];
            }
          }
        }
      }
      if (customFields.length) {
        obj.$addToSet["campaignMeta.extra.extra"] = { $each: customFields };
      }
      importData.push(obj);
    });
    // add job per person
    for (let person of importData) {
      JobsHelpers.addJob({
        jobType: "people.importPerson",
        jobData: {
          campaignId,
          listId,
          person: JSON.stringify(person)
        }
      });
    }

    return;
  },
  findDuplicates({ personId }) {
    const person = People.findOne(personId);
    let matches = [];
    const _queries = () => {
      let queries = [];
      let defaultQuery = {
        _id: { $ne: person._id },
        campaignId: person.campaignId,
        $or: []
      };
      // avoid matching person with different facebookId
      if (person.facebookId) {
        defaultQuery.$and = [
          {
            $or: [
              { facebookId: { $exists: false } },
              { facebookId: person.facebookId }
            ]
          }
        ];
      }
      // sorted by uniqueness importance
      const fieldGroups = [
        ["name"],
        [
          "campaignMeta.contact.email",
          "campaignMeta.social_networks.twitter",
          "campaignMeta.social_networks.instagram"
        ]
      ];
      for (const fieldGroup of fieldGroups) {
        let query = { ...defaultQuery };
        query.$or = [];
        for (const field of fieldGroup) {
          const fieldVal = get(person, field);
          // clear previous value
          if (fieldVal) {
            query.$or.push({ [field]: fieldVal });
          }
        }
        if (query.$or.length) {
          queries.push(query);
        }
      }
      if (!queries.length) {
        return false;
      }
      return queries;
    };
    const queries = _queries();
    if (queries && queries.length) {
      for (const query of queries) {
        matches.push(People.find(query).fetch());
      }
    }

    let grouped = groupBy(uniqBy(flatten(matches), "_id"), "facebookId");

    return mapKeys(grouped, (value, key) => {
      if (person.facebookId && key == person.facebookId) {
        return "same";
      } else if (key == "undefined") {
        return "none";
      }
      return key;
    });
  },
  importPerson({ campaignId, listId, person }) {
    let selector = { _id: Random.id(), campaignId };
    let foundMatch = false;
    const _queries = () => {
      let queries = [];
      let defaultQuery = { campaignId, $or: [] };
      // sorted by uniqueness importance
      const fieldGroups = [
        ["name"],
        [
          "campaignMeta.contact.email",
          "campaignMeta.social_networks.twitter",
          "campaignMeta.social_networks.instagram"
        ]
      ];
      for (const fieldGroup of fieldGroups) {
        let query = { ...defaultQuery };
        query.$or = [];
        for (const field of fieldGroup) {
          const fieldVal = person.$set[field];
          // clear previous value
          if (fieldVal) {
            query.$or.push({ [field]: fieldVal });
          }
        }
        if (query.$or.length) {
          queries.push(query);
        }
      }
      if (!queries.length) {
        return false;
      }
      return queries;
    };

    const _upsertAddToSet = () => {
      const keys = Object.keys(person.$addToSet);
      if (keys.length) {
        for (const key of keys) {
          for (const value of person.$addToSet[key].$each) {
            switch (key) {
              // Extra values
              case "campaignMeta.extra.extra":
                People.update(
                  {
                    ...selector,
                    [`${key}.key`]: value.key
                  },
                  {
                    $set: {
                      ...person.$set,
                      [`${key}.$.val`]: value.val
                    },
                    $setOnInsert: {
                      source: "import",
                      listId
                    }
                  },
                  { multi: false }
                );
                break;
              default:
            }
          }
        }
      }
    };

    const queries = _queries();
    let matches = [];
    if (queries) {
      for (const query of queries) {
        matches.push(People.find(query).fetch());
      }
    }
    for (const match of matches) {
      if (match && match.length == 1) {
        foundMatch = true;
        selector._id = match[0]._id;
      }
    }

    if (foundMatch) {
      _upsertAddToSet();
    }

    res = People.upsert(
      selector,
      {
        ...person,
        $setOnInsert: {
          source: "import",
          listId
        }
      },
      { multi: false }
    );

    return res;
  },
  removeExportFile({ path }) {
    return Promise.await(
      new Promise((resolve, reject) => {
        fs.unlink(path, resolve);
      })
    );
  }
};

exports.PeopleHelpers = PeopleHelpers;
