import { FlowRouter } from "meteor/kadira:flow-router";
import React from "react";
import { mount } from "react-mounter";
import { pick } from "lodash";

import App from "/imports/ui2/containers/App.jsx";
import MyAccount from "/imports/ui2/pages/MyAccount.jsx";
import Transparency from "/imports/ui2/pages/Transparency.jsx";

import PeopleFormPage from "/imports/ui2/containers/PeopleFormPage.jsx";

import PeoplePage from "/imports/ui2/pages/People.jsx";
import MapPage from "/imports/ui2/containers/MapPage.jsx";
import FAQPage from "/imports/ui2/containers/FAQPage.jsx";
import CommentsPage from "/imports/ui2/containers/CommentsPage.jsx";
import PeopleSinglePage from "/imports/ui2/containers/PeopleSinglePage.jsx";

import AdsetPage from "/imports/ui2/pages/Adset.jsx";

import ChatbotPage from "/imports/ui2/pages/chatbot/index.jsx";

import CampaignSettingsPage from "/imports/ui2/pages/campaign/settings/General.jsx";
import CampaignFacebookPage from "/imports/ui2/pages/campaign/settings/Facebook.jsx";
import CampaignTeamPage from "/imports/ui2/pages/campaign/settings/Team.jsx";
import CampaignActionsPage from "/imports/ui2/pages/campaign/settings/Actions.jsx";
import NewCampaignPage from "/imports/ui2/containers/campaign/New.jsx";

import { APP_NAME, addTitle, trackRouteEntry } from "./utils.js";

// app routes
const appRoutes = FlowRouter.group({
  name: "app",
  triggersEnter: [trackRouteEntry]
});

appRoutes.route("/", {
  name: "App.dashboard",
  action: function() {
    addTitle(`${APP_NAME} | Technology for Political Innovation`);
    return mount(App);
  }
});

appRoutes.route("/transparency", {
  name: "App.transparency",
  action: function() {
    addTitle(`${APP_NAME} | Transparency`);
    return mount(App, { content: { component: Transparency } });
  }
});

appRoutes.route("/f/:formId?", {
  name: "App.peopleForm",
  action: function(params, queryParams) {
    addTitle(`${APP_NAME} | Help the campaign!`);
    return mount(PeopleFormPage, {
      formId: params.formId,
      campaignId: queryParams.c
    });
  }
});

appRoutes.route("/account", {
  name: "App.account",
  action: function() {
    addTitle(`${APP_NAME} | My account`);
    return mount(App, { content: { component: MyAccount } });
  }
});

appRoutes.route("/people", {
  name: "App.people",
  action: function(params, queryParams) {
    addTitle(`${APP_NAME} | People`);
    return mount(App, {
      content: { component: PeoplePage },
      query: pick(queryParams, [
        "q",
        "category",
        "source",
        "tag",
        "form",
        "commented",
        "private_reply",
        "creation_from",
        "creation_to",
        "reaction_count",
        "reaction_type"
      ]),
      options: pick(queryParams, ["sort", "order"])
    });
  }
});

appRoutes.route("/people/:personId", {
  name: "App.people.detail",
  action: function(params, queryParams) {
    addTitle(`${APP_NAME} | People`);
    return mount(App, {
      content: { component: PeopleSinglePage },
      personId: params.personId,
      section: queryParams.section
    });
  }
});

appRoutes.route("/comments", {
  name: "App.comments",
  action: function(params, queryParams) {
    addTitle(`${APP_NAME} | Gestão de comentários`);
    return mount(App, {
      content: { component: CommentsPage },
      query: pick(queryParams, [
        "q",
        "resolved",
        "category",
        "mention",
        "unreplied",
        "hideReplies",
        "privateReply"
      ]),
      page: queryParams.page
    });
  }
});

appRoutes.route("/adset", {
  name: "App.adset",
  action: function() {
    addTitle(`${APP_NAME} | Criar adset`);
    return mount(App, {
      content: { component: AdsetPage }
    });
  }
});

appRoutes.route("/map", {
  name: "App.map",
  action: function() {
    addTitle(`${APP_NAME} | Territory`);
    return mount(App, { content: { component: MapPage } });
  }
});

appRoutes.route("/faq", {
  name: "App.faq",
  action: function() {
    addTitle(`${APP_NAME} | Frequently Asked Questions`);
    return mount(App, { content: { component: FAQPage } });
  }
});

appRoutes.route("/chatbot", {
  name: "App.chatbot",
  action: function(params, queryParams) {
    addTitle(`${APP_NAME} | Chatbot`);
    return mount(App, {
      content: { component: ChatbotPage },
      module: queryParams.module
    });
  }
});

appRoutes.route("/campaign/new", {
  name: "App.campaign.new",
  action: function() {
    addTitle(`${APP_NAME} | New Campaign`);
    return mount(App, {
      content: { component: NewCampaignPage }
    });
  }
});
appRoutes.route("/campaign/settings", {
  name: "App.campaign.settings",
  action: function() {
    addTitle(`${APP_NAME} | Campaign Settings`);
    return mount(App, { content: { component: CampaignSettingsPage } });
  }
});
appRoutes.route("/campaign/settings/facebook", {
  name: "App.campaign.facebook",
  action: function() {
    addTitle(`${APP_NAME} | Campaign Facebook Settings`);
    return mount(App, { content: { component: CampaignFacebookPage } });
  }
});
appRoutes.route("/campaign/settings/team", {
  name: "App.campaign.team",
  action: function() {
    addTitle(`${APP_NAME} | Campaign Team`);
    return mount(App, { content: { component: CampaignTeamPage } });
  }
});
appRoutes.route("/campaign/settings/actions", {
  name: "App.campaign.actions",
  action: function() {
    addTitle(`${APP_NAME} | Campaign Actions`);
    return mount(App, { content: { component: CampaignActionsPage } });
  }
});

appRoutes.route("/:campaignSlug/:formId?", {
  name: "App.campaignForm",
  action: function(params, queryParams) {
    addTitle(`${APP_NAME}`);
    return mount(PeopleFormPage, {
      campaignSlug: params.campaignSlug,
      formId: params.formId
    });
  }
});
