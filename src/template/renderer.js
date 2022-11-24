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

    return value1 != value2;
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
  constructor(tag, { id, style, attributes, classNames, innerHTML } = {}) {
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

    if (innerHTML) {
      this._template.innerHTML = innerHTML;
    }

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

  set innerHTML(value) {
    this._template.innerHTML = value;
  }

  get innerHTML() {
    return this._template.innerHTML;
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
    let innerHTML = struct["innerHTML"];

    if (tag == undefined) {
      throw new Error("The tag can't be empty");
    }

    let template = new Template(tag, {
      id: id,
      classNames: classNames,
      style: style,
      attributes: attributes,
      innerHTML: innerHTML,
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

const codes = {
  "#1": {
    color: "#f22c2c",
  },
};

class CommandIndicator extends Template {
  constructor(text, color) {
    super("div");

    this.style.setValues({
      "font-family": "Roboto_Regular",
      "font-size": "17px",
      padding: "5px",
      background: color,
      "border-radius": "8px",
      color: "white",
      "margin-right": "10px",
    });
    this.state.setValue("color", color);
  }

  updateState(name, value, stateName) {
    if (name == "color") {
      this.style.setValue("background", value);
    }
  }

  set text(value) {
    this.innerHTML = value;
  }

  get text() {
    return this.innerHTML;
  }

  set color(value) {
    this.state.setValue("color", value);
  }
  get color() {
    return this.state.getValue("color");
  }
}

class CommandTextContainer extends Template {
  constructor() {
    super("text");
    this.style.setValues({
      "font-family": "Roboto_Regular",
      "font-size": "25px",
      "border-right": "1px solid black",
    });
  }
  set text(value) {
    this.innerHTML = value;
  }
  get text() {
    return this.innerHTML;
  }
}

class CommandConponent extends Template {
  constructor() {
    super("div");

    this.style.setValues({
      width: "100vw",
      height: "60px",
      background: "white",
      "border-radius": "8px",
    });

    this.addChild({
      tag: "div",
      classNames: ["CommandContainer"],
      ref: (ref) => (this.commandContainer = ref),
      style: {
        height: "100%",
        display: "flex",
        "align-items": "center",
        "padding-left": "15px",
      },
    });
    this.getText();
  }

  onIsInDowm() {
    this.indiciator = new CommandIndicator("", "white");
    this.textRender = new CommandTextContainer();
    this.commandContainer.addChilds([this.indiciator, this.textRender]);
  }

  updateState(name, value, stateName) {
    if (name == "text") {
      value = value.replace(/ /g, "&nbsp;");

      if (value.startsWith("#") && codes[value.slice(0, 2)] != undefined) {
        let inidicatorValue = value.slice(0, 2);
        let textValue = value.slice(2);

        this.indiciator.text = inidicatorValue;
        this.textRender.text = textValue;
        this.indiciator.color = codes[inidicatorValue].color;

        this.indiciator.render = true;
        this.textRender.render = true;
      } else {
        this.textRender.text = value;
        this.indiciator.render = false;
      }
    }
  }

  getText() {
    let text = "";

    addEventListener("keypress", ({ key }) => {
      text += key;
      this.state.setValue("text", text);
    });

    addEventListener("keydown", (e) => {
      if (e.key === "Backspace") {
        text = text.slice(0, -1);
      } else if (e.key === "Enter") {
      } else {
      }

      this.state.setValue("text", text);
    });
  }
}

class ProcessText {
  constructor(text = "") {
    this.text = text;
    this.commands = [];
  }

  isMathExpresion() {
    const exp =
      /([1-9]|\+|\-|\\|log|cos|tan|cot|sin|csc|sec|\*|\(|\)|\{|\}|\[|\]|\^|\_)/g;
    let text = this.text;
    text = text.replace(/ /g, "");
    text = text.replace(exp, "");
    return /[a-zA-Z]/g.test(text);
  }

  isCommand() {
    let text_command = this.text.split(" ")[0];
    for (let command of this.commands) {
      if (text_command == command) {
        return true;
      }
    }
    return false;
  }

  processPathExpre() {}
}

class Lexer {
  constructor(mathExp) {
    this.mathExp = mathExp;
    this.idx = 0;
    this.character = mathExp[0];

    this.keywordsFunc = {
      log: { name: "log", func: Math.log },
      cos: { name: "cos", func: Math.cos },
      sin: { name: "sin", func: Math.sin },
      tan: { name: "tan", func: Math.tan },
      csc: { name: "csc", func: Math.csc },
      sec: { name: "sec", func: Math.sec },
      cot: { name: "cot", func: Math.cot },
    };

    this.keywords = {
      pi: { name: "pi", value: Math.PI },
    };
  }

  advance() {
    this.idx++;
    if (this.idx < this.mathExp.length) {
      this.character = this.mathExp[this.idx];
    } else {
      this.character = undefined;
    }
  }

  getTokens() {
    let tokens = [];

    while (this.character != undefined) {
      if (this.character == " ") {
        this.advance();
      } else if (this.character == "+") {
        tokens.push({ token: "PLUS" });
        this.advance();
      } else if (this.character == "-") {
        tokens.push({ token: "MINUS" });
        this.advance();
      } else if (this.character == "*") {
        tokens.push({ token: "MUL" });
        this.advance();
      } else if (this.character == "/") {
        tokens.push({ token: "DIV" });
        this.advance();
      } else if (this.character == "^") {
        tokens.push({ token: "POW" });
        this.advance();
      } else if (this.character == ",") {
        tokens.push({ token: "COMA" });
        this.advance();
      } else if (this.character == "(") {
        tokens.push({ token: "LEFT_PARENT" });
        this.advance();
      } else if (this.character == ")") {
        tokens.push({ token: "RIGHT_PARENT" });
        this.advance();
      } else if (this.character == "{") {
        tokens.push({ token: "LEFT_BRACKET" });
        this.advance();
      } else if (this.character == "}") {
        tokens.push({ token: "RIGHT_BRACKET" });
        this.advance();
      } else if (this.character == "[") {
        tokens.push({ token: "LEFT_SQUARE_BRACKET" });
        this.advance();
      } else if (this.character == "]") {
        tokens.push({ token: "RIGHT_SQUARE_BRACKET" });
        this.advance();
      } else if (/[0-9]|\./g.test(this.character)) {
        tokens.push(this.getNumberToken());
      } else if (/[a-zA-Z]/g.test(this.character)) {
        tokens.push(this.getKeywords());
      }
    }
    return tokens;
  }

  getNumberToken() {
    let number = "";
    let dotCount = 0;

    while (
      this.character != " " &&
      /[0-9]|\./g.test(this.character) &&
      this.character != undefined
    ) {
      if (this.character == ".") {
        number += ".";
        dotCount += 1;
      } else {
        number += this.character;
      }

      this.advance();
    }

    if (dotCount > 2) {
      throw new Error("The expresion" + number + "is incorrect");
    }

    if (dotCount == 1) {
      return { token: "FLOAT", value: parseFloat(number) };
    }

    return { token: "INT", value: parseInt(number) };
  }

  getKeywords() {
    let keyword = "";
    while (
      /[a-zA-Z0-9]|\_/g.test(this.character) &&
      this.character != " " &&
      this.character != undefined
    ) {
      keyword += this.character;
      this.advance();
    }

    if (
      this.keywordsFunc[keyword] == undefined &&
      this.keywords[keyword] == undefined
    ) {
      throw new Error("The keyword " + keyword + " is incorrect");
    }

    if (this.keywords[keyword] != undefined) {
      return { token: "KEYWORD", value: this.keywords[keyword] };
    }

    if (this.keywordsFunc[keyword] != undefined) {
      return { token: "KEYWORDFUNC", value: this.keywordsFunc[keyword] };
    }
  }
}

class NumberNode {
  constructor(tok) {
    this.tok = tok;
  }
}

class BinOpNode {
  constructor(leftNode, opTok, rightNode) {
    this.leftNode = leftNode;
    this.opTok = opTok;
    this.rightNode = rightNode;
  }
}

class UnaryOpNode {
  constructor(opTok, node) {
    this.opTok = opTok;
    this.node = node;
  }
}

class FuncArgsNode {
  constructor() {
    this.argsNodes = [];
  }
  add(node) {
    this.argsNodes.push(node);
  }
}

class FuncNode {
  constructor(argsNode, funcTok) {
    this.argsNode = argsNode;
    this.funcTok = funcTok;
  }
}

class KeywordNode {
  constructor(tok) {
    this.tok = tok;
  }
}

class VectorNode {
  constructor(values) {
    this.values = values;
  }
}

class Parser {
  constructor(text) {
    this.tokens = new Lexer(text).getTokens();
    this.currentToken = this.tokens[0];
    this.idx = 0;
  }

  advance() {
    this.idx++;
    if (this.idx < this.tokens.length) {
      this.currentToken = this.tokens[this.idx];
    }
  }

  atom() {
    let tok = this.currentToken;
    if (tok.token == "INT" || tok.token == "FLOAT") {
      this.advance();
      return new NumberNode(tok);
    } else if (tok.token == "LEFT_PARENT") {
      this.advance();
      let exp = this.exp();
      if (this.currentToken.token == "RIGHT_PARENT") {
        this.advance();
        return exp;
      } else {
        throw new Error("The expresion is incorrect");
      }
    } else if (tok.token == "LEFT_BRACKET") {
      this.advance();
      let args = this.getArgs();
      if (this.currentToken.token == "RIGHT_BRACKET") {
        this.advance();
        return new VectorNode(args);
      } else {
        throw new Error("The expresion is incorrect");
      }
    } else if (tok.token == "LEFT_SQUARE_BRACKET") {
      this.advance();
      let exp = this.exp();
      if (this.currentToken.token == "RIGHT_SQUARE_BRACKET") {
        this.advance();
        return exp;
      } else {
        throw new Error("The expresion is incorrect");
      }
    } else if (tok.token == "KEYWORDFUNC") {
      this.advance();
      if (this.currentToken.token == "LEFT_PARENT") {
        this.advance();
        let args = this.getArgs();
        if (this.currentToken.token == "RIGHT_PARENT") {
          this.advance();
          return new FuncNode(args, tok);
        }
        throw new Error("The expresion in incorrect");
      }
    } else if (tok.token == "KEYWORD") {
      this.advance();
      return new KeywordNode(tok);
    }
    throw new Erro("Expect");
  }

  power() {
    return this.bin_op(this.atom.bind(this), ["POW"], this.factor.bind(this));
  }

  term() {
    return this.bin_op(this.factor.bind(this), ["MUL", "DIV"]);
  }

  factor() {
    let tok = this.currentToken;

    if (tok.token == "PLUS" || tok.token == "MINUS") {
      this.advance();
      let factor = this.factor();
      return UnaryOpNode(tok, factor);
    }

    return this.power();
  }

  exp() {
    return this.bin_op(this.term.bind(this), ["PLUS", "MINUS"]);
  }

  bin_op(func_a, ops, func_b = undefined) {
    if (func_b == undefined) {
      func_b = func_a;
    }

    let left = func_a();

    while (ops.indexOf(this.currentToken.token) != -1) {
      let opTok = this.currentToken;
      this.advance();
      let right = func_b();

      left = new BinOpNode(left, opTok, right);
    }

    return left;
  }

  getArgs() {
    let args = new FuncArgsNode();
    let left = this.exp();
    args.add(left);
    while (this.currentToken.token == "COMA") {
      this.advance();
      let right = this.exp();
      args.add(right);
    }
    return args;
  }

  parse() {
    return this.exp();
  }
}

class _Number {
  constructor(value) {
    this.value = value;
  }
  addTo(other) {
    if (other instanceof _Number) {
      return new _Number(this.value + other.value);
    }
  }
  mulTo(other) {
    if (other instanceof _Number) {
      return new _Number(this.value * other.value);
    }
  }
  subTo(other) {
    if (other instanceof _Number) {
      return new _Number(this.value - other.value);
    }
  }
  powerTo(other) {
    if (other instanceof _Number) {
      return new _Number(this.value ** other.value);
    }
  }
  divTo(other) {
    if (other instanceof _Number) {
      return new _Number(this.value / other.value);
    }
  }
  copy() {
    return new Number(this.value);
  }
}
class Vector {
  constructor(values) {
    this.values = values;

    let isVector = false;
    let isNumber = false;
    for (let value of values) {
      if (value instanceof Vector) {
        isVector = true;
      }
      if (value instanceof _Number) {
        isNumber = true;
      }
    }
    if (isNumber && isVector) {
      throw new Error("the vertor is format is incorrect");
    }
  }
  addTo(other) {
    if (other instanceof Vector) {
      let values = [];
      for (let i = 0; i < this.values.length; i++) {
        values.push(this.values[i].addTo(other.values[i]));
      }
      return new Vector(values);
    }
  }
}

class Interpreter {
  visit(node) {
    if (node instanceof BinOpNode) {
      return this.visitBinOpNode(node);
    }
    if (node instanceof UnaryOpNode) {
      return this.visitUnaryOpNode(node);
    }
    if (node instanceof NumberNode) {
      return this.visitNumberNode(node);
    }
    if (node instanceof FuncNode) {
      return this.visitFuncNode(node);
    }
    if (node instanceof KeywordNode) {
      return this.visitKeywordNode(node);
    }
    if (node instanceof VectorNode) {
      return this.visitVectorNode(node);
    }
  }

  visitBinOpNode(node) {
    let left = this.visit(node.leftNode);
    let right = this.visit(node.rightNode);
    let result;

    if (node.opTok.token == "PLUS") {
      result = left.addTo(right);
    }

    if (node.opTok.token == "MUL") {
      result = left.mulTo(right);
    }
    if (node.opTok.token == "DIV") {
      result = left.divTo(right);
    }
    if (node.opTok.token == "MINUS") {
      result = left.subTo(right);
    }
    if (node.opTok.token == "POW") {
      result = left.powerTo(right);
    }

    return result;
  }

  visitUnaryOpNode(node) {
    number = this.visit(node.node);
    if (node.opTok.token == "MINUS") {
      number = number.mulTo(new _Number(-1));
    }

    return number;
  }

  visitNumberNode(node) {
    return new _Number(node.tok.value);
  }

  visitFuncNode(node) {
    let func = node.funcTok.value.func;
    let args = [];

    for (let arg of node.argsNode.argsNodes) {
      args.push(this.visit(arg));
    }

    return new _Number(func(args[0].value));
  }

  visitKeywordNode(node) {
    return new _Number(node.tok.value.value);
  }

  visitVectorNode(node) {
    let values = node.values.argsNodes.map((item) => this.visit(item));
    //! vector operator how much dot product and cross product
    return new Vector(values);
  }
}
//

//

let commandComponent = new CommandConponent();
commandComponent.show();
