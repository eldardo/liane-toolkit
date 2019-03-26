import React, { Component } from "react";
import styled from "styled-components";

const Container = styled.table`
  width: 100%;
  background: #fff;
  border-spacing: 0;
  border: 1px solid #ddd;
  border-radius: 7px;
  color: #444;
  .show-on-hover {
    display: none;
  }
  a {
    color: #333;
    text-decoration: none;
    &:hover,
    &:active,
    &:focus {
      color: #000;
    }
  }
  tbody.active {
    position: relative;
    z-index: 3;
    transform: scale(1.015);
    transition: all 0.1s linear;
    box-shadow: 0 0.7rem 1rem rgba(0, 0, 0, 0.2);
    td {
      border-color: rgba(255, 255, 255, 0.4);
      background: #fc0;
    }
    tr td .show-on-hover {
      display: block;
    }
    tr:first-child {
      td:first-child {
        border-top-left-radius: 7px;
      }
      td:last-child {
        border-top-right-radius: 7px;
      }
    }
    tr:last-child {
      td:first-child {
        border-bottom-left-radius: 7px;
      }
      td:last-child {
        border-bottom-right-radius: 7px;
      }
    }
  }
  tr {
    &.interactive {
      cursor: pointer;
    }
    &:hover {
      box-shadow: 0 0 0.5rem rgba(0, 0, 0, 0.07);
      position: relative;
      z-index: 2;
      .show-on-hover {
        display: block;
      }
    }
    th,
    td {
      width: 1px;
      white-space: nowrap;
      padding: 1rem;
      line-height: 1;
      border-bottom: 1px solid #f7f7f7;
      border-right: 1px solid #f7f7f7;
      vertical-align: top;
      position: relative;
      &.highlight {
        color: #000;
      }
      &.fill {
        width: auto;
        white-space: normal;
      }
      &.small {
        font-size: 0.8em;
      }
      &.icon-number {
        font-weight: 600;
        font-size: 0.9em;
        color: rgba(0, 0, 0, 0.25);
        text-align: center;
        svg {
          font-size: 0.7em;
          margin-right: 1rem;
        }
        span {
          color: #333;
          display: inline-block;
          width: 20px;
        }
      }
      &.last {
        text-align: right;
      }
      &.extra {
        border-color: #666;
        text-align: left;
        background: #555;
        font-size: 0.8em;
        color: #fff;
        a {
          color: #fff;
          text-decoration: none;
          &:hover,
          &:active,
          &:focus {
            color: #f0f0f0;
          }
        }
      }
      &:last-child {
        border-right: 0;
      }
    }
    th {
      font-size: 0.7em;
      text-transform: uppercase;
      letter-spacing: 0.1rem;
      text-align: left;
      color: #999;
      font-weight: 600;
      cursor: default;
    }
  }
`;

export default class Table extends Component {
  render() {
    const { children } = this.props;
    return <Container>{children}</Container>;
  }
}
