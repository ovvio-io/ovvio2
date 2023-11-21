import React, { useState } from 'react';
import { Scheme, SchemeManager } from '../../../cfds/base/scheme.ts';
import { Record } from '../../../cfds/base/record.ts';
import {
  saveButtonStyle,
  cancelButtonStyle,
  inputStyle,
  tableStyle,
  thStyle,
  tdStyle,
  modalStyles,
  modalContentStyles,
} from './backoffice-styles.ts';
import { ReadonlyJSONObject } from '../../../base/interfaces.ts';
import {
  SchemeNamespace,
  TYPE_DATE,
  TYPE_NUMBER,
  TYPE_STR,
} from '../../../cfds/base/scheme-types.ts';
import { GraphManager } from '../../../cfds/client/graph/graph-manager.ts';
import { VertexManager } from '../../../cfds/client/graph/vertex-manager.ts';

interface AddRecordPageProps {
  selectedRecordType: SchemeNamespace;
  saveChangesToRepo: (recordData: Record) => void;
  closeAddModalAndOpenExplorer: () => void;
}

export function AddRecordPage(props: AddRecordPageProps) {
  const {
    selectedRecordType,
    saveChangesToRepo,
    closeAddModalAndOpenExplorer,
  } = props;
  const [recordData, setRecordData] = useState<ReadonlyJSONObject>({});
  const scheme: Scheme | undefined =
    SchemeManager.instance.getScheme(selectedRecordType);

  const handleInputChange = (fieldName: string, value: string) => {
    setRecordData((prevData) => ({
      ...prevData,
      [fieldName]: value,
    }));
  };

  const renderInputFields = () => {
    if (!scheme) return null;

    const fields = scheme.getFields();

    return Object.entries(fields).map(([fieldName, fieldType]) => {
      // deno-lint-ignore no-inferrable-types
      let inputType: string = 'text';

      switch (fieldType) {
        case TYPE_STR:
          inputType = 'text';
          break;
        case TYPE_NUMBER:
          inputType = 'number';
          break;
        case TYPE_DATE:
          inputType = 'date'; //TODO: might changed to text
          break;
      }

      return (
        <tr key={fieldName}>
          <td style={tdStyle}>
            {fieldName}
            {scheme.isRequiredField(fieldName) && (
              <span style={{ color: 'red' }}>*</span>
            )}
          </td>
          <td style={tdStyle}>
            <input
              style={inputStyle}
              type={inputType}
              value={recordData[fieldName] || ''}
              onChange={(e) => handleInputChange(fieldName, e.target.value)}
            />
          </td>
          <td style={tdStyle}>{inputType}</td>
        </tr>
      );
    });
  };

  const submitRecord = () => {
    //TODO:
    createNewRecord(name, graphManager);
  };

  function createNewRecord(
    name: string,
    graphManager: GraphManager,
    opts: CreateRecordOptions = {}
  ): VertexManager<RecordType> {
    //TODO:
    // return graphManager.createVertex<RecordType>(Record.namespace, {
    //   name,
    // }).manager;
    // closeAddModalAndOpenExplorer();
  }

  return (
    <div style={modalStyles}>
      <div style={modalContentStyles} onClick={(e) => e.stopPropagation()}>
        <h1 style={{ textAlign: 'center', textDecoration: 'underline' }}>
          Add New Record:
        </h1>
        <h3>TYPE: {selectedRecordType}</h3>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Attribute</th>
              <th style={thStyle}>Value</th>
              <th style={thStyle}>Type</th>
            </tr>
          </thead>
          <tbody>{renderInputFields()}</tbody>
        </table>
        <button style={saveButtonStyle} onClick={submitRecord}>
          Submit
        </button>
        <button
          style={cancelButtonStyle}
          onClick={closeAddModalAndOpenExplorer}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
