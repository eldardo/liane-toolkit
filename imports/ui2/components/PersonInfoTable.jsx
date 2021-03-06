import React, { Component } from "react";
import styled from "styled-components";
import moment from "moment";
import { get } from "lodash";

import Table from "../components/Table.jsx";

const dataMap = [
  {
    label: "Birthday",
    data: "campaignMeta.basic_info.birthday"
  },
  {
    label: "Gender",
    data: "campaignMeta.basic_info.gender"
  },
  {
    label: "Address",
    data: "location.formattedAddress"
  },
  {
    label: "Skills",
    data: "campaignMeta.basic_info.skills"
  },
  {
    label: "Job/Occupation",
    data: "campaignMeta.basic_info.occupation"
  }
];

const Container = styled.div`
  .table {
    > tbody {
      > tr:first-child {
        > * {
          border-top-left-radius: 7px;
        }
      }
      > tr:last-child {
        > * {
          border-bottom-left-radius: 7px;
        }
      }
    }
    td {
      color: #111;
    }
  }
  .not-found {
    font-size: 0.8em;
    color: #999;
    font-style: italic;
  }
`;

export default class PersonInfoTable extends Component {
  getValue = key => {
    const { person } = this.props;
    const data = get(person, key);
    if (!data) {
      return <span className="not-found">Information not registered</span>;
    }
    if (data instanceof Date) {
      return (
        moment(data).format("DD/MM/YYYY") +
        ` (${moment().diff(data, "years")} years old)`
      );
    }
    if (Array.isArray(data)) {
      return data.join(", ");
    }
    return data;
  };
  getExtra = () => {
    const { person } = this.props;
    return get(person, "campaignMeta.extra");
  };
  render() {
    const extra = this.getExtra();
    return (
      <Container>
        <Table>
          <tbody>
            {dataMap.map((d, i) => (
              <tr key={i}>
                <th>{d.label}</th>
                <td className="fill">{this.getValue(d.data)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        {extra && extra.length ? (
          <>
            <h3>Extra info</h3>
            <Table>
              <tbody>
                {extra.map((item, i) => (
                  <tr key={i}>
                    <th>{item.key}</th>
                    <td className="fill">{item.val}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        ) : null}
      </Container>
    );
  }
}
