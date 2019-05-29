import React, { Component } from "react";
import ReactTooltip from "react-tooltip";
import styled from "styled-components";
import moment from "moment";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import Page from "../components/Page.jsx";
import Reaction from "../components/Reaction.jsx";
import Button from "../components/Button.jsx";

const Container = styled.div`
  flex: 1 1 100%;
  overflow: auto;
  background: #fff;
`;

const Comment = styled.article`
  border-bottom: 1px solid #ddd;
  font-size: 0.9em;
  display: flex;
  justify-content: center;
  .comment-content {
    flex: 1 1 100%;
  }
  .comment-reply,
  .comment-actions,
  .comment-resolve {
    flex: 0 0 auto;
    padding: 1rem;
    border-left: 1px solid #eee;
    ${"" /* background: #f7f7f7;
    border-left: 1px solid #eee; */}
  }
  .comment-reply {
    .reaction-filter {
      margin-bottom: 0.5rem;
    }
    .button-group {
      font-size: 0.8em;
    }
  }
  .comment-resolve {
    justify-content: center;
    align-items: center;
    background: #f7f7f7;
    border-left: 1px solid #eee;
  }
  header {
    padding: 0.5rem 1rem;
    color: #666;
    h3 {
      margin: 0.5rem 0;
      font-family: "Open sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
      font-size: 1em;
      .name {
        color: #333;
        font-weight: 600;
        font-size: 1.1em;
      }
      .date {
        color: #999;
        font-size: 0.9em;
        margin-left: 0.5rem;
      }
    }
  }
  .comment-message {
    background: #f0f0f0;
    font-size: 0.9em;
    padding: 1rem;
    position: relative;
    margin: 0 1rem 1rem 1rem;
    border-radius: 7px;
    &:before {
      content: "";
      background: #f0f0f0;
      position: absolute;
      width: 10px;
      height: 10px;
      left: 1rem;
      top: -5px;
      transform: rotate(45deg);
    }
    p {
      margin: 0;
    }
  }
  .action-icons {
    display: flex;
    a {
      width: 40px;
      height: 40px;
      display: flex;
      margin: 0 0.25rem;
      justify-content: center;
      align-items: center;
      color: #63c;
      background-color: rgba(102, 51, 204, 0);
      border: 1px solid rgba(102, 51, 204, 0.25);
      border-radius: 100%;
      transition: all 0.1s linear;
      &:hover,
      &:focus {
        background-color: #63c;
        color: #fff;
      }
    }
  }
  .comment-resolve {
    display: flex;
    justify-content: center;
    align-items: center;
    a {
      width: 40px;
      height: 40px;
      display: flex;
      margin: 0 0.5rem;
      justify-content: center;
      align-items: center;
      border-radius: 100%;
      color: #006633;
      &:hover,
      &:focus {
        background: #006633;
        color: #fff;
      }
    }
  }
  .action-label {
    font-size: 0.8em;
    color: #666;
  }
`;

export default class CommentsPage extends Component {
  render() {
    const { comments } = this.props;
    return (
      <>
        <Page.Nav full plain />
        <Container>
          {comments.length ? (
            <div>
              {comments.map((comment, i) => (
                <Comment key={comment._id}>
                  <div className="comment-content">
                    <header>
                      <h3>
                        <span className="name">{comment.person.name}</span>{" "}
                        comentou em um post{" "}
                        <span className="date">
                          {moment(comment.created_time).fromNow()}
                        </span>
                      </h3>
                    </header>
                    <section className="comment-message">
                      <p>{comment.message}</p>
                    </section>
                  </div>
                  <div className="comment-reply">
                    <p className="action-label">Reagir e responder</p>
                    <Reaction.Filter target={comment._id} />
                    <Button.Group>
                      <Button>Responder</Button>
                      <Button>Inbox</Button>
                    </Button.Group>
                  </div>
                  <div className="comment-actions">
                    <p className="action-label">Classificar</p>
                    <div className="action-icons">
                      <a
                        href="javascript:void(0);"
                        data-tip="Marcar como pergunta"
                      >
                        <FontAwesomeIcon icon="question" />
                      </a>
                      <a
                        href="javascript:void(0);"
                        data-tip="Marcar como declaração de voto"
                      >
                        <FontAwesomeIcon icon="thumbs-up" />
                      </a>
                      <a
                        href="javascript:void(0);"
                        data-tip="Marcar pessoa como troll"
                      >
                        <FontAwesomeIcon icon="ban" />
                      </a>
                    </div>
                  </div>
                  <div className="comment-resolve">
                    <a
                      href="javascript:void(0);"
                      data-tip="Marcar com resolvido"
                    >
                      <FontAwesomeIcon icon="check" />
                    </a>
                  </div>
                </Comment>
              ))}
              <ReactTooltip effect="solid" />
            </div>
          ) : null}
        </Container>
      </>
    );
  }
}
