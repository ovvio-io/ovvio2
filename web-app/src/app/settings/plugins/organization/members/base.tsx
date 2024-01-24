import React, { useState } from 'react';
import { Step0 } from './step0.tsx';
import { Step1 } from './step1.tsx';
import { Step2 } from './step2.tsx';
import Wizard from '../../../components/wizard.tsx';
import { AddMembers } from './addMembers.tsx';
import { Workspace } from '../../../../../../../cfds/client/graph/vertices/workspace.ts';
import { Step3 } from './step3.tsx';

export default function MembersTabContent() {
  const [step, setStep] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedWorkspaces, setSelectedWorkspaces] = useState<Workspace[]>([]);

  const handleCloseWizard = () => {
    setSelectedUsers(new Set<string>());
    setStep(0);
  };

  return (
    <div>
      {step > 0 && step < 5 && (
        <Wizard onClose={handleCloseWizard} currentStepIndex={step} />
      )}
      {step === 0 && <Step0 setStep={setStep} />}
      {step === 5 && <AddMembers onClose={handleCloseWizard} />}
      {step === 1 && (
        <Step1
          setStep={setStep}
          selectedUsers={selectedUsers}
          setSelectedUsers={setSelectedUsers}
        />
      )}
      {step === 2 && (
        <Step2
          setStep={setStep}
          selectedUsers={selectedUsers}
          setSelectedUsers={setSelectedUsers}
          selectedWorkspaces={selectedWorkspaces}
          setSelectedWorkspaces={setSelectedWorkspaces}
        />
      )}
      {step === 3 && (
        <Step3
          setStep={setStep}
          selectedUsers={selectedUsers}
          selectedWorkspaces={selectedWorkspaces}
          setSelectedUsers={setSelectedUsers}
          setSelectedWorkspaces={setSelectedWorkspaces}
        />
      )}
    </div>
  );
}
