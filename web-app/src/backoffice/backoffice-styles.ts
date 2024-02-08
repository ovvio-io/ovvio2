enum Colors {
  PrimaryGreen = '#4CAF50',
  SecondaryGreen = '#8BC34A',
  PrimaryRed = '#FF412C',
  SecondaryRed = '#FF1B2B',
  White = '#fff',
  Black = '#000',
  Gray = '#ccc',
}

interface Style {
  [key: string]: string | number;
}

export const modalStyles: Style = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  zIndex: 1000,
};

export const modalContentStyles: Style = {
  width: '680px',
  padding: '20px',
  background: Colors.White,
  position: 'relative',
  borderRadius: '8px',
  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
  textAlign: 'center',
  maxHeight: '90vh',
  overflowY: 'auto',
};

export const buttonStyle: Style = {
  margin: '0 5px',
  padding: '6px 12px',
  cursor: 'pointer',
  borderRadius: '4px',
  border: 'none',
  transition: 'background-color 0.3s, transform 0.3s',
  boxShadow: `0 4px 6px rgba(${Colors.Black}, 0.1)`,
  fontSize: '0.9em',
};

export const saveButtonStyle: Style = {
  ...buttonStyle,
  background: `linear-gradient(to right, ${Colors.PrimaryGreen}, ${Colors.SecondaryGreen})`,
  color: Colors.White,
};

export const cancelButtonStyle: Style = {
  ...buttonStyle,
  background: `linear-gradient(to right, ${Colors.PrimaryRed}, ${Colors.SecondaryRed})`,
  color: Colors.White,
};

export const removeButtonStyle: Style = {
  ...buttonStyle,
  background: `linear-gradient(to right, ${Colors.PrimaryRed}, ${Colors.SecondaryRed})`,
  color: Colors.White,
};

export const addButtonStyle: Style = {
  ...buttonStyle,
  background: `linear-gradient(to right, ${Colors.PrimaryGreen}, ${Colors.SecondaryGreen})`,
  color: Colors.White,
  marginTop: '30px',
  display: 'block',
  marginLeft: 'auto',
  marginRight: 'auto',
};

export const editButtonStyle: Style = {
  ...buttonStyle,
  background: `linear-gradient(to right, #36D1DC, #5B86E5)`,
  color: Colors.White,
};

export const inputStyle: Style = {
  padding: '10px',
  marginTop: '10px',
  marginBottom: '15px',
  width: '100%',
  boxSizing: 'border-box',
  border: `1px solid ${Colors.Gray}`,
  borderRadius: '4px',
  fontSize: '14px',
};

export const tableStyle = {
  width: '90%',
  borderCollapse: 'collapse',
  marginTop: '20px',
  fontFamily: '"Arial", sans-serif',
  margin: '20px auto',
};

export const thStyle = {
  border: '1.2px solid #e0e0e1',
  padding: '12px 15px',
  backgroundColor: '#f5f5f5',
  fontFamily: 'PoppinsBold, HeeboBold',
};

export const tdStyle = {
  border: '1px solid #e0e0e0',
  padding: '12px 15px',
  fontSize: '0.9em',
  textAlign: 'center',
};

export const toastStyles = {
  position: 'fixed',
  top: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  padding: '15px 25px',
  borderRadius: '5px',
  zIndex: 10000,
  backgroundColor: '#333',
  color: 'white',
  fontSize: '20px',
};

export const successStyle = {
  backgroundColor: 'green',
};

export const errorStyle = {
  backgroundColor: 'red',
};
export const infoStyle = {
  backgroundColor: Colors.PrimaryRed,
};
