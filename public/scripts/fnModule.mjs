const moduleFunction = {
  stringToHtml: (template) => {
    const parser = new DOMParser();
    const element = parser.parseFromString(template, "text/html");
    return element.body.firstChild;
  },

  removeAllChildNodes: (parent) => {
    while (parent.firstChild) {
      parent.removeChild(parent.firstChild);
    }
  },
};

export { moduleFunction };
