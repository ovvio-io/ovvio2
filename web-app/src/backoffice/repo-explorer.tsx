import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGraphManager } from '../core/cfds/react/graph.tsx';
import { H1 } from '../../../styles/components/texts.tsx';
import { Repository } from '../../../repo/repo.ts';
import { ReadonlyJSONObject } from '../../../base/interfaces.ts';
import { Record } from '../../../cfds/base/record.ts';
import { Modal } from './edit-record-modal.tsx';
import { Scheme } from '../../../cfds/base/scheme.ts';
import {
  tableStyle,
  thStyle,
  tdStyle,
  editButtonStyle,
  removeButtonStyle,
  addButtonStyle,
  toastStyles,
  errorStyle,
  successStyle,
  infoStyle,
} from './backoffice-styles.ts';
import { AddRecordModal } from './add-record-type-modal.tsx';
import { AddRecordPage } from './add-record-page.tsx';

interface URLParams {
  repoId?: string;
  repoType?: string;
}

interface RepoExplorerState {
  successMessage: string | null;
  errorMessage: string | null;
  editingKey: string;
  editingValue: Record<string, any> | null;
  isModalVisible: boolean;
  currentScheme: Scheme;
  isAddModalVisible: boolean;
  selectedRecordType: null;
  isAddRecordPageVisible: boolean;
}

export function RepoExplorer() {
  const [state, setState] = useState<RepoExplorerState>({
    successMessage: null,
    errorMessage: null,
    editingKey: '',
    editingValue: null,
    isModalVisible: false,
    currentScheme: null,
    isAddModalVisible: false,
    selectedRecordType: null,
    isAddRecordPageVisible: false,
  });

  const graph = useGraphManager();
  const { repoId, repoType } = (useParams<URLParams>() || {
    repoType: 'sys',
    repoId: 'dir',
  }) as URLParams;

  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const repo = graph.repository(Repository.id(repoType, repoId));
  const keys = Array.from(repo.keys()).sort();
  const startEditing = (
    key: string,
    RecordToEdit: Record,
    recordScheme: Scheme
  ) => {
    setState({
      ...state,
      editingKey: key,
      editingValue: RecordToEdit,
      currentScheme: recordScheme,
      isModalVisible: true,
    });
  };
  const openAddModal = () => {
    setState({
      ...state,
      isAddModalVisible: true,
      isAddRecordPageVisible: false,
    });
  };
  const openAddRecordPage = () => {
    setState({
      ...state,
      isAddModalVisible: false,
      isAddRecordPageVisible: true,
    });
  };

  const closeAddModal = () => {
    setState({
      ...state,
      isAddModalVisible: false,
      selectedRecordType: null,
      isAddRecordPageVisible: false,
    });
  };
  const closeAddModalAndOpenExplorer = () => {
    setState({
      ...state,
      isAddModalVisible: false,
      isAddRecordPageVisible: false,
      selectedRecordType: null,
    });
  };

  const selectRecordType = (recordType: string) => {
    setState({
      ...state,
      selectedRecordType: recordType,
    });
  };

  const deleteRecord = (key: string, recordToDelete: Record) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this record?'
    );

    if (confirmDelete) {
      const originalRecord = recordToDelete.toJS();
      const updatedRecordJS: ReadonlyJSONObject = {
        ...originalRecord,
        d: { ...originalRecord.d, isDeleted: 1 },
      };
      const updatedRecord: Record = Record.fromJS(updatedRecordJS);
      saveChangesToRepo(updatedRecord);
    }
  };

  const onClose = () => {
    setState((prevState) => ({
      ...prevState,
      isModalVisible: false,
      currentScheme: null,
    }));
  };

  const displayToastMessage = (
    message: string,
    type: 'success' | 'info' | 'error'
  ) => {
    setToast({ message, type });
  };

  const saveChangesToRepo = (updatedRecord: Record) => {
    try {
      const success = repo.setValueForKey(
        state.editingKey,
        graph.session,
        updatedRecord
      );

      if (success) {
        displayToastMessage('Changes saved successfully!!!', 'success');
      } else {
        setToast({
          message: 'No changes were made to the record.',
          type: 'info',
        });
      }
      onClose();
    } catch (error) {
      console.error('Error while saving changes:', error);
      setToast({
        message: `Failed to save changes. Error: ${error.message}`,
        type: 'error',
      });
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <H1
        style={{
          textAlign: 'center',
          textDecoration: 'underline',
        }}
      >
        Contents of {repoId}:
      </H1>
      <button style={addButtonStyle} onClick={() => openAddModal()}>
        Add a new record
      </button>
      {state.isAddModalVisible && (
        <AddRecordModal
          closeAddModal={closeAddModal}
          openAddRecordPage={openAddRecordPage}
          selectRecordType={selectRecordType}
        />
      )}
      {state.isAddRecordPageVisible && (
        <AddRecordPage
          selectedRecordType={state.selectedRecordType}
          closeAddModalAndOpenExplorer={closeAddModalAndOpenExplorer}
          onSave={saveChangesToRepo}
        />
      )}
      {toast && (
        <div
          style={{
            ...toastStyles,
            ...(toast.type === 'success'
              ? successStyle
              : toast.type === 'error'
              ? errorStyle
              : infoStyle),
          }}
          onClick={() => setToast(null)}
        >
          {toast.message}
        </div>
      )}
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Record Key</th>
            <th style={thStyle}>Record Type</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => {
            const currRecord = repo.valueForKey(key, graph.session);
            const value = currRecord.scheme.namespace;
            return (
              <tr key={key}>
                <td style={tdStyle}>{key}</td>
                <td style={tdStyle}>{value}</td>
                <td style={tdStyle}>
                  <button
                    style={editButtonStyle}
                    onClick={() =>
                      startEditing(key, currRecord, currRecord.scheme)
                    }
                  >
                    Edit
                  </button>
                  <button
                    style={removeButtonStyle}
                    onClick={() => deleteRecord(key, currRecord)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {state.isModalVisible && (
        <Modal
          onClose={onClose}
          saveChangesToRepo={saveChangesToRepo}
          RecordToEdit={state.editingValue}
          RecordKey={state.editingKey}
          currentScheme={state.currentScheme}
        />
      )}
    </div>
  );
}
