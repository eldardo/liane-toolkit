import React, { Component } from "react";
import styled from "styled-components";

import { alertStore } from "../containers/Alerts.jsx";
import { modalStore } from "../containers/Modal.jsx";

import Loading from "./Loading.jsx";
import Form from "./Form.jsx";
import Button from "./Button.jsx";
import Comment from "./Comment.jsx";
import FAQSelect from "./FAQSelect.jsx";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  .comment,
  form {
    flex: 1 1 100%;
  }
  .comment {
    margin: -2rem -2rem 0 -2rem;
    padding: 2rem;
    font-size: 0.8em;
    background: #f7f7f7;
    border-radius: 0 0 0 7px;
    .comment-message {
      background-color: #e0e0e0;
      &:before {
        background-color: #e0e0e0;
      }
    }
  }
  .tip {
    font-style: italic;
    color: #666;
    font-size: 0.9em;
    margin: 1rem 0 0;
  }
  .faq-select {
    font-size: 0.9em;
    background: #f7f7f7;
    margin: 0 -2rem;
    padding: 1rem;
    border-bottom: 1px solid #ddd;
  }
  .radio-select {
    display: flex;
    font-size: 0.8em;
    margin: 0 -2rem;
    padding: 1rem 2rem;
    border-top: 1px solid #ddd;
    border-bottom: 1px solid #ddd;
    background: #f0f0f0;
    label {
      margin: 0;
      flex: 1 1 100%;
      color: #444;
      input {
        margin: 0 0.5rem 0 0;
      }
    }
    label.disabled {
      color: #ccc;
    }
  }
  .message-text {
    margin: 1rem -1rem;
    padding: 1rem;
    display: block;
    width: auto;
  }
  .button-group {
    margin-top: 2rem;
  }
`;

export default class PrivateReply extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      sendAs: props.defaultSendAs || "message",
      faq: [],
      text: ""
    };
  }
  componentDidMount() {
    const { personId, comment, messageOnly } = this.props;
    if (personId) {
      this.fetchPersonComment();
    } else if (comment) {
      this.setState({ comment });
      this.fetchFAQ(comment.person.campaignId);
      if (!comment.can_reply_privately) {
        this.setState({
          sendAs: "comment",
          disabledMessage: true
        });
        if (messageOnly) {
          alertStore.add("Comment cannot receive a private reply", "error");
          modalStore.reset();
        }
      }
    }
  }
  fetchPersonComment = () => {
    const { personId } = this.props;
    this.setState({ loading: true });
    Meteor.call("people.getReplyComment", { personId }, (err, res) => {
      this.setState({
        loading: false
      });
      if (err || !res) {
        this.setState({
          errored: true
        });
        if (err) {
          alertStore.add(err);
        } else {
          alertStore.add(
            "Unable to find a comment to reply privately to",
            "error"
          );
          modalStore.reset();
        }
      } else {
        this.setState({
          comment: res.comment
        });
        this.fetchFAQ(res.comment.person.campaignId);
      }
    });
  };
  fetchFAQ = campaignId => {
    this.setState({ loading: true });
    Meteor.call("faq.query", { campaignId }, (err, res) => {
      this.setState({
        loading: false
      });
      if (!err) {
        this.setState({
          faq: res,
          type: res.length ? "faq" : "write"
        });
      }
    });
  };
  _handleTypeChange = ({ target }) => {
    this.setState({
      type: target.value,
      edit: false,
      text: ""
    });
  };
  _handleTextChange = ({ target }) => {
    this.setState({
      text: target.value
    });
  };
  _handleFAQChange = id => {
    const { faq } = this.state;
    this.setState({
      text: id ? faq.find(item => item._id == id).answer : ""
    });
  };
  sendPrivateReply = () => {
    const { text, comment } = this.state;
    if (!text) {
      alertStore.add("You must send a message", "error");
      return;
    }
    this.setState({
      loading: true
    });
    Meteor.call(
      "people.sendPrivateReply",
      {
        campaignId: comment.person.campaignId,
        personId: comment.person._id,
        commentId: comment._id,
        message: text
      },
      (err, res) => {
        this.setState({
          loading: false
        });
        if (err) {
          alertStore.add(err);
        } else {
          alertStore.add("Sent", "success");
          modalStore.reset();
        }
      }
    );
  };
  sendCommentResponse = () => {
    const { text, comment } = this.state;
    if (!text) {
      alertStore.add("You must send a message", "error");
      return;
    }
    this.setState({
      loading: true
    });
    Meteor.call(
      "comments.send",
      {
        campaignId: comment.person.campaignId,
        objectId: comment._id,
        message: text
      },
      (err, res) => {
        this.setState({
          loading: false
        });
        if (err) {
          alertStore.add(err);
        } else {
          alertStore.add("Sent", "success");
          modalStore.reset();
        }
      }
    );
  };
  send = () => {
    const { sendAs } = this.state;
    switch (sendAs) {
      case "message":
        this.sendPrivateReply();
        break;
      case "comment":
        this.sendCommentResponse();
        break;
      default:
    }
  };
  _handleSubmit = ev => {
    ev.preventDefault();
    this.send();
  };
  _handleSendClick = ev => {
    ev.preventDefault();
    this.send();
  };
  _handleEditClick = ev => {
    ev.preventDefault();
    const { edit, text } = this.state;
    this.setState({
      edit: !edit,
      text: edit ? "" : text
    });
  };
  _handleSendAsChange = ev => {
    const { value } = ev.target;
    this.setState({
      sendAs: value
    });
  };
  render() {
    const { messageOnly } = this.props;
    const {
      sendAs,
      loading,
      faq,
      type,
      errored,
      comment,
      text,
      edit,
      disabledMessage
    } = this.state;
    if (!errored && comment) {
      return (
        <Container>
          <div className="comment">
            <p>You are replying:</p>
            <Comment comment={comment} />
          </div>
          {!loading ? (
            <Form onSubmit={this._handleSubmit}>
              <div className="radio-select">
                <label className={!faq || !faq.length ? "disabled" : ""}>
                  <input
                    type="radio"
                    name="type"
                    value="faq"
                    onChange={this._handleTypeChange}
                    checked={type == "faq"}
                    disabled={!faq || !faq.length}
                    onKeyPress={e => e.key === "Enter" && e.preventDefault()}
                  />{" "}
                  Send predefined message
                </label>
                <label>
                  <input
                    type="radio"
                    name="type"
                    value="write"
                    onChange={this._handleTypeChange}
                    checked={type == "write"}
                    onKeyPress={e => e.key === "Enter" && e.preventDefault()}
                  />{" "}
                  Write new message
                </label>
              </div>
              {!loading && (!faq || !faq.length) ? (
                <p className="tip">
                  You can use predefined messages by creating{" "}
                  <a href={FlowRouter.path("App.faq")} target="_blank">
                    answers to frequently asked questions
                  </a>
                  .
                </p>
              ) : null}
              {type == "write" || edit ? (
                <textarea
                  className="message-text"
                  placeholder="Write a message to send"
                  onChange={this._handleTextChange}
                  value={text}
                />
              ) : null}
              {faq && faq.length && type == "faq" && !edit ? (
                <FAQSelect faq={faq} onChange={this._handleFAQChange} />
              ) : null}
              {!messageOnly ? (
                <div className="radio-select">
                  <label>
                    <input
                      type="radio"
                      name="sendAs"
                      value="comment"
                      checked={sendAs == "comment"}
                      onChange={this._handleSendAsChange}
                    />
                    Send as a comment reply
                  </label>
                  <label className={disabledMessage ? "disabled" : ""}>
                    <input
                      type="radio"
                      name="sendAs"
                      value="message"
                      checked={sendAs == "message"}
                      onChange={this._handleSendAsChange}
                      disabled={disabledMessage}
                    />
                    Send as a private reply{" "}
                    {disabledMessage ? "(Unavailable)" : ""}
                  </label>
                </div>
              ) : null}
              <Button.Group>
                {type == "faq" ? (
                  <Button disabled={!text} onClick={this._handleEditClick}>
                    {!edit ? "Select and edit message" : "Back to selection"}
                  </Button>
                ) : null}
                <Button
                  primary
                  disabled={!text}
                  onClick={this._handleSendClick}
                >
                  {sendAs == "message"
                    ? "Send private reply"
                    : "Send comment reply"}
                </Button>
              </Button.Group>
            </Form>
          ) : (
            <Loading />
          )}
        </Container>
      );
    } else {
      return <Loading />;
    }
    return null;
  }
}
