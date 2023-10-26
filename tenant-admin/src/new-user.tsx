import React from 'react';
export function NewUserForm() {
  return (
    <form>
      <label htmlFor={'email'}>Email</label>
      <input id={'email'} type="email"></input>
    </form>
  );
}
