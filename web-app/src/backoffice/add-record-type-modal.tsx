import React, { useState } from "react";
import {
  modalStyles,
  saveButtonStyle,
  cancelButtonStyle,
  modalContentStyles,
  inputStyle,
} from "./backoffice-styles.ts";
import { SchemeNamespace } from "../../../cfds/base/scheme-types.ts";

interface AddRecordModalProps {
  closeAddModal: () => void;
  openAddRecordPage: () => void;
  selectRecordType: (recordType: SchemeNamespace) => void;
}

export function AddRecordModal({
  closeAddModal,
  openAddRecordPage,
  selectRecordType,
}: AddRecordModalProps) {
  const [selectedRecordType, setSelectedRecordType] =
    useState<SchemeNamespace | null>(null);

  const handleRecordTypeSelection = (recordType: SchemeNamespace) => {
    setSelectedRecordType(recordType);
    selectRecordType(recordType);
  };

  const openAddPage = () => {
    if (selectedRecordType) {
      openAddRecordPage();
    }
  };
  const recordTypes = Object.values(SchemeNamespace).filter(
    (recordType) => recordType !== SchemeNamespace.Null
  );

  return (
    <div style={modalStyles}>
      <div style={modalContentStyles} onClick={(e) => e.stopPropagation()}>
        <h2>Select Record Type</h2>
        <select
          style={inputStyle}
          onChange={(e) =>
            handleRecordTypeSelection(e.target.value as SchemeNamespace)
          }
          value={selectedRecordType || ""}
        >
          <option value="">Select Record Type</option>
          {recordTypes.map((recordType) => (
            <option key={recordType} value={recordType}>
              {recordType}
            </option>
          ))}
        </select>
        <button style={saveButtonStyle} onClick={openAddPage}>
          Create
        </button>
        <button style={cancelButtonStyle} onClick={() => closeAddModal()}>
          Cancel
        </button>
      </div>
    </div>
  );
}
