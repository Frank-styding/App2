function create_UUID() {
  var dt = new Date().getTime();
  var uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    function (c) {
      var r = (dt + Math.random() * 16) % 16 | 0;
      dt = Math.floor(dt / 16);
      return (c == "x" ? r : (r & 0x3) | 0x8).toString(16);
    },
  );
  return uuid;
}

class State {
  constructor(name, data = {}) {
    this.data = data;
    this.name = name;
    this.updateCallback = undefined;
    this.deleteCallback = undefined;
  }

  setState(data) {
    for (let key in this.data) {
      this.updateCallback(key, this.data[key], this.name);
    }

    this.data = data;

    for (let key in data) {
      this.updateCallback(key, data[key], this.name);
    }
  }

  update() {
    for (let key in this.data) {
      this.updateCallback(key, this.data[key], this.name);
    }
  }

  setUpdateCallback(callback) {
    this.updateCallback = callback;
  }

  setDeleteCallback(callback) {
    this.deleteCallback = callback;
  }

  setValue(name, value) {
    if (this.compareValues(this.data[name], value)) {
      this.updateCallback(name, value, this.name);
      this.data[name] = value;
    }
  }

  setValues(data) {
    for (let key in data) {
      this.setValue(key, data[key]);
    }
  }

  removeValue(name) {
    if (this.data[name] == undefined) return;
    this.deleteCallback(name);
    delete this.data[name];
  }

  getValue(name) {
    return this.data[name];
  }

  compareValues(value1, value2) {
    if (value1 == undefined) {
      return true;
    }

    if (typeof value1 !== typeof value2) {
      return false;
    }

    if (typeof value1 == "object") {
      return JSON.stringify(value1) !== JSON.stringify(value2);
    }

    return value1 == value2;
  }
}

class SetState {
  constructor(name, data = []) {
    this.data = new Set(data);
    this.updateCallback = undefined;
    this.name = name;
  }

  update() {
    for (let item of this.data) {
      this.updateCallback("push", item, this.name);
    }
  }

  setState(value) {
    for (let item of this.data) {
      this.updateCallback("remove", item, this.name);
    }

    this.data = value;

    for (let item of value) {
      this.updateCallback("push", item, this.name);
    }
  }

  setUpdateCallback(callback) {
    this.updateCallback = callback;
  }

  add(item) {
    this.data.add(item);
    this.updateCallback("push", item, this.name);
  }

  remove(item) {
    this.data.delete(item);
    this.updateCallback("remove", item, this.name);
  }

  has(item) {
    return this.data.has(item);
  }

  get length() {
    return this.data.length;
  }

  set length(value) {
    this.data.length = value;
  }
}

class EventLog {
  constructor() {
    this.data = {};
  }

  registerEvent(name, callback) {
    if (this.data[name] == undefined) {
      this.data[name] = [];
    }
    this.data[name].push(callback);
  }

  triggerEvent(name, context) {
    if (this.data[name] == undefined) return;
    this.data[name].forEach((item) => item(context));
  }
}

class Template {
  constructor(tag, { id, style, attributes, classNames } = {}) {
    /**
     * @type {HTMLElement} _template
     */
    this._template = document.createElement(tag);
    this._uuid = create_UUID();

    this._id = "";

    if (id) {
      this.id = id;
    }

    this.style = new State("style", style ?? {});
    this.atributes = new State("atributes", attributes ?? {});
    this.events = new EventLog();
    this.classNames = new SetState("classNames", classNames ?? []);
    this.state = new State("state");
    this.isInDowm = false;
    this.context = undefined;
    this._render = true;

    this.style.setUpdateCallback(this.updateCallback.bind(this));
    this.atributes.setUpdateCallback(this.updateCallback.bind(this));

    this.style.setDeleteCallback(this.deleteCallback.bind(this));
    this.atributes.setDeleteCallback(this.deleteCallback.bind(this));

    this.classNames.setUpdateCallback(this.updateClassName.bind(this));

    this.state.setUpdateCallback(this.updateState.bind(this));

    this.style.update();
    this.atributes.update();
    this.classNames.update();
    this.parent = undefined;
    this.childs = [];
  }

  set render(value) {
    this._render = value;
    this.parent.updateRenderChilds();
  }

  get render() {
    return this._render;
  }

  set id(value) {
    this._id = value;
    this._template.setAttribute("id", value);
  }

  get id() {
    return this.value;
  }

  updateCallback(name, value, stateName) {
    if (stateName == "style") {
      this._template.style.setProperty(name, value);
    }
    if (stateName == "attributes") {
      this._template.setAttribute(name, value);
    }
  }

  deleteCallback(name) {
    if (stateName == "style") {
      this._template.removeAttribute(name);
    }
    if (stateName == "attributes") {
      this._template.style.removeProperty(name);
    }
  }

  updateClassName(name, value) {
    if (name == "push") {
      this._template.classList.add(value);
    }
    if (name == "remove") {
      this._template.classList.remove(value);
    }
  }

  updateState(name, value, stateName) {}

  onIsInDowm() {}

  updateRenderChilds() {
    for (let child of this.childs) {
      try {
        this._template.removeChild(child._template);
      } catch {
        continue;
      }
    }

    for (let child of this.childs) {
      if (child.render) {
        this._template.appendChild(child._template);
      }
    }
  }

  addChild(template) {
    let _template;

    if (template instanceof Template) {
      _template = template;
    } else if (typeof template == "object") {
      _template = Template.convertToTemplate(template);
    }

    _template.parent = this;
    this.childs.push(_template);
    this._template.appendChild(_template._template);
  }

  addChilds(templates) {
    for (let child of templates) {
      this.addChild(child);
    }
  }

  removeChild(uuid) {
    let items = this.childs.filter((item) => item._uuid == uuid);

    if (items.length > 0) {
      this._template.removeChild(items[0]._template);
    }

    this.chlids = this.childs.filter((item) => item._uuid != uuid);
  }

  propagationChild(callback) {
    this.childs.forEach((item) => {
      item.propagationChild(callback);
    });

    callback(this);
  }

  getTemplate() {
    return this._template;
  }

  show() {
    let rootElement = document.getElementById("root");

    if (rootElement) {
      rootElement.appendChild(this._template);
      //this.isInDowm = true;
      this.propagationChild((item) => {
        item.isInDowm = true;
        item.onIsInDowm();
      });
    }
  }

  static convertToTemplate(struct) {
    let tag = struct["tag"];
    let attributes = struct["attributes"];
    let style = struct["style"];
    let childs = struct["childs"];
    let ref = struct["ref"];
    let id = struct["id"];
    let classNames = struct["classNames"];

    if (tag == undefined) {
      throw new Error("The tag can't be empty");
    }

    let template = new Template(tag, {
      id: id,
      classNames: classNames,
      style: style,
      attributes: attributes,
    });

    if (childs) {
      if (Array.isArray(childs)) {
        for (let child of struct.childs) {
          if (child instanceof Template) {
            template.addChild(child);
            continue;
          }
          template.addChild(Template.convertToTemplate(child));
        }
      } else if (childs instanceof Template) {
        template.addChild(childs);
        return template;
      } else {
        template.addChild(Template.convertToTemplate(childs));
      }
    }

    if (ref) {
      ref(template);
    }

    return template;
  }
}
