import React, { useState } from 'react';
import { Step0 } from './step0.tsx';
import { Step1 } from './step1.tsx';
import { Step2 } from './step2.tsx';
import Wizard from '../../../components/wizard.tsx';
import { Edit } from './edit.tsx';

type Step3Props = {
  setStep: (step: number) => void;
  selectedUsers: Set<string>;
  setSelectedUsers: (users: Set<string>) => void;
};

export const Step3: React.FC<Step3Props> = ({
  setStep,
  selectedUsers,
  setSelectedUsers,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="480"
      height="500"
      viewBox="0 0 480 500"
      fill="none"
      textAnchor="WOHOOHOHOH"
    >
      <path
        d="M62.3933 74.0595C56.411 69.9827 48.5233 70.027 42.5854 74.1481L0.0449219 103.705V171.061H105.997V103.705L62.3933 74.0595Z"
        fill="#EAE3DF"
      />
      <path
        d="M65.6719 62.4472C75.3321 62.5358 84.3719 64.1754 93.013 67.2773L104.224 44.8549C105.155 42.9495 105.509 40.9554 105.509 39.0056C98.3305 40.8224 91.5506 43.5698 84.9923 47.3808C77.6807 51.5019 71.2996 56.5979 65.6719 62.4472Z"
        fill="#67B4F0"
      />
      <path
        d="M46.6167 87.7486C47.4143 88.1918 48.079 88.6792 48.8766 89.1223C50.4276 85.0012 52.4217 80.8358 54.726 76.9363C57.9165 71.5744 61.5502 66.7443 65.6713 62.3573C65.2281 62.3573 64.8293 62.3573 64.3862 62.3573H63.6772C48.6551 62.3573 34.7851 65.991 22.1116 73.214C20.3834 74.2332 18.6552 75.2967 17.0156 76.4045L17.636 77.6896C28.0052 79.2849 37.6655 82.564 46.6167 87.7486Z"
        fill="#67B4F0"
      />
      <path
        d="M54.8142 76.9831C52.4656 80.9713 50.5158 85.0038 48.9648 89.1692C57.9161 94.7083 65.5379 101.665 71.7417 110.041L93.1449 67.2343C84.5038 64.1324 75.464 62.5814 65.8038 62.4042C61.6384 66.8798 57.9161 71.7099 54.8142 76.9831Z"
        fill="#2B81DF"
      />
      <path
        d="M48.9645 89.2125C48.1669 88.7694 47.5022 88.282 46.7046 87.8388C37.7533 82.6542 28.0488 79.2864 17.8125 77.8241L42.2289 126.568C42.8493 127.853 43.6913 128.917 44.5775 129.759C44.0458 125.948 43.7799 122.181 43.7799 118.193C43.6913 107.913 45.4195 98.2524 48.9645 89.2125Z"
        fill="#2B81DF"
      />
      <path
        d="M48.9659 89.2128C45.5095 98.3412 43.7812 108.001 43.7812 118.282C43.7812 122.27 44.0471 126.037 44.5789 129.848C50.0294 135.21 59.7782 134.146 63.4562 126.657L71.7427 110.084C65.5389 101.709 57.9171 94.7519 48.9659 89.2128Z"
        fill="#105CD1"
      />
      <path
        d="M105.997 171.063H0V103.707L52.9983 144.076L105.997 103.707V171.063Z"
        fill="#DBD5D2"
      />
      <path
        d="M0 171.06H105.952L62.3484 141.415C56.3661 137.338 48.4784 137.382 42.5405 141.503L0 171.06Z"
        fill="#CCC8C6"
      />
      <path
        d="M61.4179 42.9939C61.5952 42.9939 61.8167 42.9496 61.994 42.8166C62.4371 42.5064 62.5701 41.8861 62.2599 41.4429C61.3293 40.0692 60.2215 38.2524 59.867 36.3913C59.6454 35.1062 59.8227 33.9097 60.3987 33.0678C61.1964 31.9156 62.6587 31.3396 64.2096 30.7192C66.0708 29.9659 67.9762 29.2125 69.0397 27.3514C70.0589 25.5789 69.7488 23.7177 69.5272 22.0782C69.3056 20.6158 69.1284 19.2421 69.7488 18.09C70.5021 16.7163 71.9201 16.1402 73.5597 15.4312C75.4208 14.6779 77.5035 13.7916 78.6557 11.4874C80.118 8.60702 79.7192 4.97336 77.6365 2.44752C77.282 2.00439 76.6616 1.96008 76.2184 2.31458C75.7753 2.66909 75.731 3.28947 76.0855 3.7326C77.6808 5.63806 77.991 8.42977 76.8831 10.6011C76.0412 12.2407 74.4459 12.9054 72.762 13.6144C71.0338 14.3234 69.0841 15.1653 67.9762 17.1594C67.0014 18.9319 67.2672 20.7488 67.5331 22.3884C67.7547 23.895 67.9319 25.2244 67.3115 26.3765C66.6025 27.6173 65.0516 28.2377 63.4563 28.9024C61.6838 29.6114 59.867 30.3204 58.7591 32.0043C57.8729 33.2893 57.5627 35.0176 57.8729 36.8344C58.2717 39.05 59.5568 41.1327 60.576 42.6394C60.7975 42.8609 61.1077 42.9939 61.4179 42.9939Z"
        fill="#EB6949"
      />
      <path
        d="M30.5024 23.3831L34.5352 23.9807L36.2956 12.1016L32.2629 11.5039L30.5024 23.3831Z"
        fill="#E29F3D"
      />
      <path
        d="M16.0226 42.7396L12.6914 45.0898L19.6145 54.9022L22.9456 52.552L16.0226 42.7396Z"
        fill="#2B81DF"
      />
      <path
        d="M106.001 3.78408L104.484 0L93.3378 4.46728L94.8544 8.25136L106.001 3.78408Z"
        fill="#FAB551"
      />
    </svg>
  );
};

export default function MembersTabContent() {
  const [step, setStep] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

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
      {step === 5 && <Edit setStep={setStep} onClose={handleCloseWizard} />}

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
        />
      )}
      {step === 3 && (
        <Step3
          setStep={setStep}
          selectedUsers={selectedUsers}
          setSelectedUsers={setSelectedUsers}
        />
      )}
    </div>
  );
}
