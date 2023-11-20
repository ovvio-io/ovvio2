import React from 'react';
import { IconOpen } from '../../../../../styles/components/new-icons/icon-open.tsx';
import './styles.css';

export const Box = (): JSX.Element => {
  return (
    <div className="box">
      <div className="multiselection">
        <div className="overlap">
          <div className="text-wrapper">Assign to Workspaces</div>
          <IconOpen />
          <div className="wizard">
            <div className="div">Members</div>
            <div className="text-wrapper-2">Workspaces</div>
            <div className="text-wrapper-3">Assign</div>
            <div className="group">
              <div className="overlap-group">
                <div className="text-wrapper-4">1</div>
              </div>
            </div>
            <div className="overlap-wrapper">
              <div className="div-wrapper">
                <div className="text-wrapper-5">2</div>
              </div>
            </div>
            <div className="overlap-group-wrapper">
              <div className="div-wrapper">
                <div className="text-wrapper-5">3</div>
              </div>
            </div>
            <img className="line" alt="Line" src="line-106.svg" />
            <img className="img" alt="Line" src="line-107.svg" />
          </div>
        </div>
      </div>
    </div>
  );
};
