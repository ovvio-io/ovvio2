const SIZE = 160;

export default function cropProfileImage(file) {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    const url = URL.createObjectURL(file);
    img.onload = e => {
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      const width = img.width;
      const height = img.height;
      let x = 0,
        y = 0;
      let size;
      if (width > height) {
        size = height;
        x = (width - size) / 2;
      } else {
        size = width;
        y = (height - size) / 2;
      }
      ctx.drawImage(img, x, y, size, size, 0, 0, SIZE, SIZE);
      const url = canvas.toDataURL();
      URL.revokeObjectURL(url);
      resolve({ dataUrl: url });
    };
    img.onError = () => reject();
    img.src = url;
  });
}
