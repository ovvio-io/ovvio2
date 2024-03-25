import React, { useEffect, useRef } from 'react';
import { cn, makeStyles } from '../css-objects/index.ts';
import Menu, { MenuAction, useMenuContext } from './menu.tsx';
import {
  BlueActionButton,
  WhiteActionButton,
} from '../../web-app/src/app/settings/components/settings-buttons.tsx';
import { IconDelete } from './new-icons/icon-delete.tsx';

const useStyles = makeStyles(() => ({
  confirmation: {
    display: 'flex',
    padding: '8px 10px 10px ',
    flexDirection: 'column',
    alignItems: 'center',
    fontWeight: '600',
    fontSize: '14px',
  },
  confirmationButtons: {
    display: 'flex',
    padding: '16px 0px 8px 0px',
    flexDirection: 'column',
    gap: '8px',
    alignItems: 'center',
  },
}));

interface ConfirmationDialogProps {
  className?: string;
  nCards?: number;
  titleText?: string;
  itemText?: string;
  imgSrc?: string;
  approveButtonText: string;
  handleApproveClick: () => void;
  handleCancelClick: () => void;
}

export function ConfirmationDialog({
  className,
  nCards,
  titleText,
  itemText,
  imgSrc,
  approveButtonText,
  handleApproveClick,
  handleCancelClick,
}: ConfirmationDialogProps) {
  const styles = useStyles();
  const componentRef = useRef<HTMLDivElement>(null);
  const menuCtx = useMenuContext();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        componentRef.current &&
        !componentRef.current.contains(event.target as Node)
      ) {
        menuCtx.close();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuCtx]);

  return (
    <div ref={componentRef} className={cn(styles.confirmation, className)}>
      {titleText ? titleText : `Delete ${nCards} ${itemText}`}
      <div className={cn(styles.confirmationButtons)}>
        <BlueActionButton
          onClick={handleApproveClick}
          disable={false}
          buttonText={approveButtonText}
          imgSrc={imgSrc ? imgSrc : '/icons/settings/Delete-white.svg'}
        />
        <WhiteActionButton
          onClick={handleCancelClick}
          disable={false}
          buttonText={'Cancel'}
          imgSrc="/icons/settings/Close-big.svg"
        />
      </div>
    </div>
  );
}

interface deleteWithConfirmationProps {
  showConfirmation: boolean;
  setShowConfirmation: React.Dispatch<React.SetStateAction<boolean>>;
  onCancelClick: () => void;
  onDeleteClick: () => void;
  titleText?: string;
}

//not in use, maybe i will use it with some adjustments.
export function DeleteWithConfirmation({
  showConfirmation,
  setShowConfirmation,
  onCancelClick,
  onDeleteClick,
  titleText,
}: deleteWithConfirmationProps) {
  const handleDeleteClick = () => {
    setShowConfirmation(true);
  };
  const handleCancelClick = () => {
    setShowConfirmation(false);
  };
  const handleConfirmDelete = () => {
    setShowConfirmation(false);
  };

  return (
    <Menu
      renderButton={() => (
        <BlueActionButton
          disable={false}
          buttonText={'Delete'}
          imgSrc={'/icons/settings/Delete-white.svg'}
        />
      )}
      direction="out"
      position="bottom"
      align="end"
    >
      <ConfirmationDialog
        titleText={titleText}
        approveButtonText={'Delete'}
        handleApproveClick={onDeleteClick}
        handleCancelClick={handleCancelClick}
      />
    </Menu>
  );
}
