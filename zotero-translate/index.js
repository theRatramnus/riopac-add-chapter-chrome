import marcFactory from "./translators/MARC.gen.js";
import marcxmlFactory from "./translators/MARCXML.gen.js";

const MARC_ID = "a6ee60df-1ddc-4aae-bb25-45e0537be973";

// Minimal stand-ins for the Zotero.Utilities the two translators use.
const ZU = {
  xpath(node, path, ns = {}) {
    const doc = node.ownerDocument || node;
    const resolver = (prefix) => ns[prefix] || null;
    const result = doc.evaluate(path, node, resolver, 5 /* ORDERED_NODE_ITERATOR_TYPE */, null);
    const nodes = [];
    for (let n = result.iterateNext(); n; n = result.iterateNext()) nodes.push(n);
    return nodes;
  },
  xpathText(node, path, ns, delimiter = ", ") {
    const nodes = ZU.xpath(node, path, ns);
    return nodes.length ? nodes.map((n) => n.textContent).join(delimiter) : null;
  },
  lpad(string, pad, length) {
    string = String(string);
    while (string.length < length) string = pad + string;
    return string;
  },
  capitalizeTitle(title) {
    return title; // only used for MARC 245 in all-caps records
  },
  cleanAuthor(author, creatorType, useComma) {
    author = author.replace(/^[\s .,/[\]:]+/, "").replace(/[\s .,/[\]:]+$/, "");
    author = author.replace(/\s+/g, " ");
    if (useComma) {
      const [lastName, ...rest] = author.split(/\s*,\s*/);
      if (rest.length) {
        return { firstName: rest.join(", "), lastName, creatorType };
      }
      return { lastName: author, creatorType, fieldMode: 1 };
    }
    const parts = author.split(" ");
    return {
      firstName: parts.slice(0, -1).join(" "),
      lastName: parts.at(-1),
      creatorType,
    };
  },
};

function createRuntime(xml) {
  const translators = new Map();
  const items = [];

  const Zotero = {
    Utilities: ZU,
    debug() {},
    getXML: () => xml,
    read() {
      throw new Error("Zotero.read is not supported");
    },
    Item: class {
      constructor(itemType) {
        this.itemType = itemType;
        this.creators = [];
        this.tags = [];
        this.notes = [];
        this.attachments = [];
        this.seeAlso = [];
      }
      complete() {
        items.push(this);
      }
    },
    loadTranslator() {
      let id;
      return {
        setTranslator: (translatorID) => (id = translatorID),
        getTranslatorObject: async () => translators.get(id).exports,
      };
    },
  };

  const marc = marcFactory(Zotero, ZU);
  translators.set(MARC_ID, marc);
  return { marcxml: marcxmlFactory(Zotero, ZU), items };
}

export async function convertMARC21ToZoteroItem(doc) {
  // converts a MARC21 XML document to a Zotero item
  const { marcxml, items } = createRuntime(doc);
  await marcxml.doImport();
  if (items.length === 0) throw new Error("No MARC record found");

  // JSON-roundtrip: drop the Item class and undefined fields
  return JSON.parse(JSON.stringify(items[0]));
}
