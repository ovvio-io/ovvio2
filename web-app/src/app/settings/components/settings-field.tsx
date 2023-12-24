import React, { useEffect, useRef, useState } from 'react';
import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts';
import { IconCompose2 } from '../../../../../styles/components/new-icons/icon-compose2.tsx';
import { IconDuplicate } from '../../../../../styles/components/new-icons/icon-duplicate.tsx';
import { Button } from '../../../../../styles/components/buttons.tsx';
import { brandLightTheme as theme } from '../../../../../styles/theme.tsx';

const useStyles = makeStyles(() => ({
  inputContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  title: {
    fontSize: '13px',
    fontWeight: '600',
    letterSpacing: ' 0.075px',
  },
  info: {
    fontSize: '13px',
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 'normal',
  },
  infoLight: {
    color: 'var(--monochrom-m-3, #B3B3B3)',
    fontSize: '13px',
    fontWeight: '400',
  },
  field: {
    lineHeight: 'normal',
    fontStyle: 'normal',
    padding: [0, 0, '40px', 0],
  },
  editLine: {
    width: '480px',
    height: '1px',
    background: theme.primary.p8,
    margin: '5px 0px 0px 0px',
  },
}));

interface SettingsFieldProps {
  onChange?: (newValue: string) => void;
  title: string;
  titleType?: 'primary' | 'secondary';
  placeholder?: string;
  value: string | number | boolean;
  className?: string;
  toggle: 'editable' | 'duplicate' | 'label' | 'light';
}

const SettingsField: React.FC<SettingsFieldProps> = ({
  onChange,
  title,
  titleType,
  placeholder,
  value,
  className,
  toggle,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange && onChange(event.target.value);
  };

  const toggleEditMode = () => {
    setIsEditing(true);
  };
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const styles = useStyles();
  const renderValue = () => {
    switch (toggle) {
      case 'editable':
        if (isEditing) {
          return (
            <div>
              <div className={styles.inputContainer}>
                <input
                  ref={inputRef}
                  className={cn(styles.info)}
                  type="text"
                  value={value}
                  onChange={handleChange}
                  onBlur={() => setIsEditing(false)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'none',
                    width: '100%',
                  }}
                />
              </div>
              <div className={styles.editLine}></div>
            </div>
          );
        } else {
          return (
            <div className={styles.inputContainer}>
              <div className={value ? styles.info : styles.infoLight}>
                {value || placeholder}
              </div>
              <Button onClick={toggleEditMode}>
                <IconCompose2 style={{ paddingLeft: '8px' }} />
              </Button>
            </div>
          );
        }
      case 'duplicate':
        return (
          <div className={cn(styles.info)}>
            {value} <IconDuplicate style={{ paddingLeft: '8px' }} />
          </div>
        );
      case 'label':
        return <span className={cn(styles.info)}>{value}</span>;
      case 'light':
        return <span className={cn(styles.infoLight)}>{value}</span>;
      default:
        return null;
    }
  };
  const titleStyles = {
    primary: styles.title,
    secondary: styles.info,
  };

  return (
    <div className={cn(className, styles.field)}>
      <div className={cn(titleType ? titleStyles[titleType] : styles.title)}>
        {title}
      </div>
      {renderValue()}
    </div>
  );
};

export default SettingsField;
