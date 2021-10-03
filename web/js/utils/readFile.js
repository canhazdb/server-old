function readFile (file) {
  return new Promise(resolve => {
    const reader = new window.FileReader();

    reader.onload = function (e) {
      const content = reader.result;
      resolve(content);
    };

    reader.readAsText(file);
  });
}

export default readFile;
