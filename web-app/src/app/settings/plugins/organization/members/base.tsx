import React, { useState } from 'react';
import { Step0 } from './step0.tsx';
import { Step1 } from './step1.tsx';
import { Step2 } from './step2.tsx';
import { User } from '../../../../../../../cfds/client/graph/vertices/user.ts';
import MultiSelection from '../../../components/multi-selection.tsx';

export default function MembersTabContent() {
  const [step, setStep] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);

  const handleCloseMultiSelection = () => {
    setStep(0);
  };

  return (
    <div>
      <MultiSelection
        onClose={handleCloseMultiSelection}
        currentStepIndex={step}
      />
      {step === 0 && <Step0 setStep={setStep} />}
      {step === 1 && (
        <Step1
          setStep={setStep}
          selectedUsers={selectedUsers}
          setSelectedUsers={setSelectedUsers}
        />
      )}
      {step === 2 && <Step2 setStep={setStep} selectedUsers={selectedUsers} />}
    </div>
  );
}
