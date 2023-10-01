// deno-lint-ignore-file
import React, { useState, useEffect } from "react";
import { Scheme } from "../../../cfds/base/scheme.ts";
import { Record } from "../../../cfds/base/record.ts";
import {
  modalStyles,
  saveButtonStyle,
  cancelButtonStyle,
  modalContentStyles,
  inputStyle,
  tableStyle,
  thStyle,
  tdStyle,
  removeButtonStyle,
} from "./backoffice-styles.ts";
import { ReadonlyJSONObject } from "../../../base/interfaces.ts";
import { prettyJSON } from "../../../base/common.ts";

interface ModalProps {
  RecordToEdit: Record;
  currentScheme: Scheme;
  saveChangesToRepo: (data: Record) => void;
  onClose: () => void;
  RecordKey?: string;
}

export function Modal(props: ModalProps) {
  const { RecordToEdit, currentScheme, onClose, saveChangesToRepo, RecordKey } =
    props;
  const [editedRecord, setEditedRecord] = useState<ReadonlyJSONObject>(
    RecordToEdit.toJS().d
  );
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const [textareaValues, setTextareaValues] = useState<{
    [key: string]: string;
  }>({});

  const renderTableRow = (fieldName: string, fieldType: string) => {
    const handleValueChange = (
      event: React.ChangeEvent<HTMLTextAreaElement>
    ) => {
      const newValue = event.target.value;
      setTextareaValues((prevValues) => ({
        ...prevValues,
        [fieldName]: newValue,
      }));
    };
    return (
      <tr key={fieldName}>
        <td style={tdStyle}>{fieldName}</td>
        <td style={tdStyle}>
          <textarea
            value={
              textareaValues[fieldName] ?? prettyJSON(editedRecord[fieldName])
            }
            onChange={handleValueChange}
            style={{ width: "100%", height: "50px" }}
          />
        </td>
        <td style={tdStyle}>{fieldType}</td>
        <td style={tdStyle}>
          <button
            style={removeButtonStyle}
            onClick={() => {
              // Handle delete action here
            }}
          >
            Remove
          </button>
        </td>
      </tr>
    );
  };

  const saveRecord = () => {
    let parsedValues;
    try {
      parsedValues = Object.fromEntries(
        Object.entries(textareaValues).map(([key, value]) => {
          return [key, JSON.parse(value)];
        })
      );
    } catch (error) {
      console.error("Failed to parse JSON:", error);
      setToast({
        message: "Failed to parse JSON. Please check the input.",
        type: "error",
      });
      return;
    }

    const updatedRecordData = {
      ...RecordToEdit.toJS(),
      d: { ...editedRecord, ...parsedValues },
    };
    const updatedRecord: Record = Record.fromJS(updatedRecordData);
    saveChangesToRepo(updatedRecord);
  };

  return (
    <div style={modalStyles} onClick={onClose}>
      <div style={modalContentStyles} onClick={(e) => e.stopPropagation()}>
        <h1 style={{ textAlign: "center", textDecoration: "underline" }}>
          Edit record:
        </h1>
        <h3>KEY: {RecordKey}</h3>
        <h3>TYPE: {RecordToEdit.scheme.namespace}</h3>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Attribute</th>
              <th style={thStyle}>Value</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {editedRecord &&
              Object.keys(editedRecord).map((fieldName) => {
                const fieldType = currentScheme?.getFieldType(fieldName);
                return renderTableRow(fieldName, fieldType);
              })}
          </tbody>
        </table>
        <button style={saveButtonStyle} onClick={saveRecord}>
          Save
        </button>
        <button style={cancelButtonStyle} onClick={props.onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
