import SimpleSchema from "simpl-schema";
import { performance } from "perf_hooks";
import { People } from "../people.js";
import peopleMetaModel from "/imports/api/facebook/people/model/meta";
import { PeopleHelpers } from "./peopleHelpers.js";
import { Campaigns } from "/imports/api/campaigns/campaigns.js";
import { Comments } from "/imports/api/facebook/comments/comments.js";
import { flattenObject } from "/imports/utils/common.js";
import _ from "underscore";
import moment from "moment";
import { get, merge, pick } from "lodash";

const buildSearchQuery = ({ campaignId, query, options }) => {
  let queryOptions = {
    skip: options.skip || 0,
    limit: Math.min(options.limit || 10, 50),
    fields: {
      name: 1,
      facebookId: 1,
      counts: 1,
      campaignMeta: 1,
      lastInteractionDate: 1
    }
  };

  if (options.sort) {
    switch (options.sort) {
      case "comments":
      case "likes":
        if (options.facebookId) {
          queryOptions.sort = {
            [`counts.${options.facebookId}.${options.sort}`]: -1
          };
        }
        break;
      case "name":
        queryOptions.sort = { name: 1 };
        break;
      case "lastInteraction":
        if (options.facebookId) {
          queryOptions.sort = {
            lastInteractionDate: -1
          };
        }
        break;
      default:
    }
  }

  query.campaignId = campaignId;

  if (query.q) {
    query.$text = { $search: query.q };
    if (!queryOptions.sort) {
      queryOptions.fields.score = { $meta: "textScore" };
      queryOptions.sort = { score: { $meta: "textScore" } };
    }
  }
  delete query.q;

  if (query.accountFilter == "account" && options.facebookId) {
    query.facebookAccounts = options.facebookId;
  }
  delete query.accountFilter;

  return { query, options: queryOptions };
};

export const peopleSearch = new ValidatedMethod({
  name: "people.search",
  validate: new SimpleSchema({
    campaignId: {
      type: String
    },
    query: {
      type: Object,
      blackbox: true
    },
    options: {
      type: Object,
      blackbox: true
    }
  }).validator(),
  run({ campaignId, query, options }) {
    this.unblock();
    logger.debug("people.search called", {
      campaignId,
      query,
      options
    });

    const searchQuery = buildSearchQuery({ campaignId, query, options });

    const cursor = People.find(searchQuery.query, searchQuery.options);

    const result = cursor.fetch();

    return result;
  }
});

export const peopleSearchCount = new ValidatedMethod({
  name: "people.search.count",
  validate: new SimpleSchema({
    campaignId: {
      type: String
    },
    query: {
      type: Object,
      blackbox: true
    },
    options: {
      type: Object,
      blackbox: true
    }
  }).validator(),
  run({ campaignId, query, options }) {
    this.unblock();
    logger.debug("people.search.count called", {
      campaignId,
      query,
      options
    });

    const searchQuery = buildSearchQuery({ campaignId, query, options });

    const result = Promise.await(
      People.rawCollection().count(searchQuery.query)
    );

    return result;
  }
});

export const peopleReplyComment = new ValidatedMethod({
  name: "people.getReplyComment",
  validate: new SimpleSchema({
    personId: {
      type: String
    },
    facebookAccountId: {
      type: String
    }
  }).validator(),
  run({ personId, facebookAccountId }) {
    logger.debug("people.getLastComment called", {
      personId,
      facebookAccountId
    });

    const userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error(401, "You need to login");
    }

    const person = People.findOne(personId);

    if (!person) {
      throw new Meteor.Error(401, "Person not found");
    }

    const campaign = Campaigns.findOne(person.campaignId);

    if (!campaign) {
      throw new Meteor.Error(401, "This campaign does not exist");
    }

    allowed = _.findWhere(campaign.users, { userId });
    if (!allowed) {
      throw new Meteor.Error(401, "You are not allowed to do this action");
    }

    const comment = Comments.findOne(
      {
        personId: person.facebookId,
        facebookAccountId,
        created_time: {
          $gte: moment()
            .subtract(4, "months")
            .toISOString()
        },
        $or: [
          { can_reply_privately: true },
          { can_reply_privately: { $exists: false } }
        ]
      },
      { sort: { created_time: -1 } }
    );

    return comment;
  }
});

export const peopleSendPrivateReply = new ValidatedMethod({
  name: "people.sendPrivateReply",
  validate: new SimpleSchema({
    campaignId: {
      type: String
    },
    commentId: {
      type: String
    },
    message: {
      type: String
    }
  }).validator(),
  run({ campaignId, commentId, message }) {
    logger.debug("people.sendPrivateReply called", {
      campaignId,
      commentId,
      message
    });

    if (!message) {
      throw new Meteor.Error(401, "You must type a message");
    }

    const userId = Meteor.userId();

    const campaign = Campaigns.findOne(campaignId);
    if (!campaign) {
      throw new Meteor.Error(401, "This campaign does not exist");
    }

    const allowed = _.findWhere(campaign.users, { userId });
    if (!allowed) {
      throw new Meteor.Error(401, "You are not allowed to do this action");
    }

    const comment = Comments.findOne(commentId);

    const campaignAccount = _.findWhere(campaign.accounts, {
      facebookId: comment.facebookAccountId
    });

    if (!campaignAccount) {
      throw new Meteor.Error(
        401,
        "Campaign does not have access to this Facebook Account"
      );
    }

    let response;

    const closeComment = () => {
      Comments.upsert(
        { _id: comment._id },
        {
          $set: {
            ...comment,
            can_reply_privately: false
          }
        }
      );
    };

    try {
      response = Promise.await(
        FB.api(`${comment._id}/private_replies`, "POST", {
          access_token: campaignAccount.accessToken,
          id: comment._id,
          message
        })
      );
    } catch (error) {
      if (error instanceof Meteor.Error) {
        throw error;
      } else if (error.response) {
        const errorCode = error.response.error.code;
        switch (errorCode) {
          case 10900:
            closeComment();
            throw new Meteor.Error(
              400,
              "You already sent a private message for this comment."
            );
          case 200:
            closeComment();
            throw new Meteor.Error(
              400,
              "Cannot send message for this comment, probably too old."
            );
          default:
            throw new Meteor.Error(500, "Unexpected Facebook response.");
        }
      }
    }
    closeComment();
    return response;
  }
});

export const updatePersonMeta = new ValidatedMethod({
  name: "facebook.people.updatePersonMeta",
  validate: new SimpleSchema({
    personId: {
      type: String
    },
    metaKey: {
      type: String
    },
    metaValue: {
      type: Match.OneOf(String, Boolean)
    }
  }).validator(),
  run({ personId, metaKey, metaValue }) {
    logger.debug("facebook.people.updatePersonMeta called", {
      personId,
      metaKey,
      metaValue
    });

    const userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error(401, "You need to login");
    }

    const person = People.findOne(personId);

    if (!person) {
      throw new Meteor.Error(401, "Person not found");
    }

    const campaign = Campaigns.findOne(person.campaignId);

    if (!campaign) {
      throw new Meteor.Error(401, "This campaign does not exist");
    }

    allowed = _.findWhere(campaign.users, { userId });
    if (!allowed) {
      throw new Meteor.Error(401, "You are not allowed to do this action");
    }

    let doc = {};
    doc[`campaignMeta.${metaKey}`] = metaValue;
    return People.update({ _id: person._id }, { $set: doc });
  }
});

export const canvasFormUpdate = new ValidatedMethod({
  name: "people.metaUpdate",
  validate: new SimpleSchema({
    campaignId: {
      type: String
    },
    personId: {
      type: String
    },
    sectionKey: {
      type: String
    },
    data: {
      type: Object,
      blackbox: true
    }
  }).validator(),
  run({ campaignId, personId, sectionKey, data }) {
    logger.debug("people.metaUpdate called", {
      campaignId,
      personId,
      sectionKey,
      data
    });

    const userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error(401, "You need to login");
    }

    const campaign = Campaigns.findOne(campaignId);
    if (!campaign) {
      throw new Meteor.Error(401, "This campaign does not exist");
    }

    const allowed = _.findWhere(campaign.users, { userId });
    if (!allowed) {
      throw new Meteor.Error(401, "You are not allowed to do this action");
    }

    return People.update(
      {
        campaignId,
        _id: personId
      },
      {
        $set: {
          [`campaignMeta.${sectionKey}`]: data
        }
      }
    );
  }
});

export const exportPeople = new ValidatedMethod({
  name: "people.export",
  validate: new SimpleSchema({
    campaignId: {
      type: String
    }
  }).validator(),
  run({ campaignId }) {
    logger.debug("people.export called", { campaignId });

    const userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error(401, "You need to login");
    }

    const campaign = Campaigns.findOne(campaignId);
    if (!campaign) {
      throw new Meteor.Error(401, "This campaign does not exist");
    }

    const allowed = _.findWhere(campaign.users, { userId });
    if (!allowed) {
      throw new Meteor.Error(401, "You are not allowed to do this action");
    }

    const people = People.find(
      { campaignId },
      {
        fields: {
          name: 1,
          facebookId: 1,
          counts: 1,
          campaignMeta: 1
        }
      }
    ).fetch();

    let flattened = [];

    let header = {};

    for (let person of people) {
      if (person.campaignMeta) {
        for (const key in person.campaignMeta) {
          person[key] = person.campaignMeta[key];
        }
        delete person.campaignMeta;
      }
      const flattenedPerson = flattenObject(person);
      for (const key in flattenedPerson) {
        header[key] = true;
      }
      flattened.push(flattenObject(person));
    }

    return Papa.unparse({
      fields: Object.keys(header),
      data: flattened
    });
  }
});

export const importPeople = new ValidatedMethod({
  name: "people.import",
  validate: new SimpleSchema({
    campaignId: {
      type: String
    },
    config: {
      type: Object,
      blackbox: true
    },
    data: {
      type: Object,
      blackbox: true
    }
  }).validator(),
  run({ campaignId, config, data }) {
    logger.debug("people.import called", { campaignId, config, data });

    const userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error(401, "You need to login");
    }

    const campaign = Campaigns.findOne(campaignId);
    if (!campaign) {
      throw new Meteor.Error(401, "This campaign does not exist");
    }

    const allowed = _.findWhere(campaign.users, { userId });
    if (!allowed) {
      throw new Meteor.Error(401, "You are not allowed to do this action");
    }
    return PeopleHelpers.import({ campaignId, config, data });
  }
});

export const findDuplicates = new ValidatedMethod({
  name: "people.findDuplicates",
  validate: new SimpleSchema({
    campaignId: {
      type: String
    },
    personId: {
      type: String
    }
  }).validator(),
  run({ campaignId, personId }) {
    logger.debug("people.findDuplicates called", { campaignId, personId });
    const userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error(401, "You need to login");
    }

    const campaign = Campaigns.findOne(campaignId);
    if (!campaign) {
      throw new Meteor.Error(401, "This campaign does not exist");
    }

    const allowed = _.findWhere(campaign.users, { userId });
    if (!allowed) {
      throw new Meteor.Error(401, "You are not allowed to do this action");
    }
    return PeopleHelpers.findDuplicates({ campaignId, personId });
  }
});

export const mergePeople = new ValidatedMethod({
  name: "people.merge",
  validate: new SimpleSchema({
    campaignId: {
      type: String
    },
    person: {
      type: Object,
      blackbox: true
    },
    from: {
      type: Array
    },
    "from.$": {
      type: String
    },
    remove: {
      type: Boolean
    }
  }).validator(),
  run({ campaignId, person, from, remove }) {
    logger.debug("people.merge called", { campaignId, person, from, remove });

    const userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error(401, "You need to login");
    }

    const campaign = Campaigns.findOne(campaignId);
    if (!campaign) {
      throw new Meteor.Error(401, "This campaign does not exist");
    }

    const allowed = _.findWhere(campaign.users, { userId });
    if (!allowed) {
      throw new Meteor.Error(401, "You are not allowed to do this action");
    }

    const autoFields = [
      "facebookId",
      "counts",
      "facebookAccounts",
      "lastInteractionDate"
    ];

    const people = People.find({
      campaignId,
      _id: { $in: from }
    }).fetch();

    let $set = {};

    merge(
      $set,
      ...people.map(p => pick(p, autoFields)),
      pick(person, autoFields)
    );

    let mergeFields = ["name"];
    for (const section of peopleMetaModel) {
      for (const field of section.fields) {
        mergeFields.push(`campaignMeta.${section.key}.${field.key}`);
      }
    }

    for (const field of mergeFields) {
      const value = get(person, field);
      if (value) {
        $set[field] = value;
      }
    }

    People.upsert(
      {
        campaignId,
        _id: person._id
      },
      {
        $set
      },
      {
        multi: false
      }
    );

    if (remove) {
      People.remove({
        campaignId,
        _id: { $in: from }
      });
    }

    return;
  }
});
