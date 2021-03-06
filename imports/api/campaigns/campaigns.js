import SimpleSchema from "simpl-schema";

const Campaigns = new Mongo.Collection("campaigns");

Campaigns.usersSchema = new SimpleSchema({
  userId: {
    type: String,
    index: 1
  },
  role: {
    type: String,
    allowedValues: ["owner", "manager", "guest"]
  }
});

Campaigns.accountChatbotSchema = new SimpleSchema({
  active: {
    type: Boolean,
    defaultValue: false
  },
  init_text_response: {
    type: Boolean,
    defaultValue: false,
    optional: true
  },
  extra_info: {
    type: Object,
    blackbox: true,
    optional: true
  }
});

Campaigns.accountsSchema = new SimpleSchema({
  facebookId: {
    type: String
  },
  accessToken: {
    type: String
  },
  chatbot: {
    type: Object,
    blackbox: true,
    optional: true
  }
});

Campaigns.audienceAccountsSchema = new SimpleSchema({
  facebookId: {
    type: String
  },
  name: {
    type: String
  },
  fanCount: {
    type: String,
    optional: true
  }
});

Campaigns.schema = new SimpleSchema({
  name: {
    type: String
  },
  creatorId: {
    type: String
  },
  users: {
    type: Array
  },
  "users.$": {
    type: Campaigns.usersSchema
  },
  country: {
    type: String,
    optional: true,
    index: 1
  },
  geolocationId: {
    type: String,
    optional: true,
    index: 1
  },
  autoReplyMessage: {
    type: String,
    optional: true
  },
  description: {
    type: String,
    optional: true
  },
  adAccountId: {
    type: String,
    optional: true
  },
  status: {
    type: String,
    optional: true
  },
  facebookAccount: {
    type: Campaigns.accountsSchema
  },
  accounts: {
    type: Array,
    optional: true
  },
  "accounts.$": {
    type: Campaigns.accountsSchema
  },
  audienceAccounts: {
    type: Array,
    optional: true
  },
  "audienceAccounts.$": {
    type: Campaigns.audienceAccountsSchema
  },
  forms: {
    type: Object,
    optional: true
  },
  "forms.slug": {
    type: String,
    optional: true,
    index: 1
  },
  "forms.crm": {
    type: Object,
    optional: true
  },
  "forms.crm.header": {
    type: String
  },
  "forms.crm.text": {
    type: String
  },
  createdAt: {
    type: Date,
    autoValue() {
      if (this.isInsert) {
        return new Date();
      } else if (this.isUpsert) {
        return { $setOnInsert: new Date() };
      } else {
        return this.unset();
      }
    }
  }
});

Campaigns.attachSchema(Campaigns.schema);

exports.Campaigns = Campaigns;
