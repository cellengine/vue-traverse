const CSSselect = require('css-select');
const Vue = require('vue');

function vNodeClass(node) {
  const data = node.data || {};
  const classes = data.class || {};
  let ret = '';

  for (const name in classes) {
    if (classes[name]) ret += name + ' ';
  }

  if (data.staticClass) ret += data.staticClass + ' ';

  return ret.slice(0, -1);
}

// We can't use `instanceof Vue` because the required Vue can be different than
// the one being used by the project if this is `npm link`ed.
function isVue(obj) {
  return obj._isVue;
}

function ndata(n) {
  return Object.assign({attrs: {}, style: {}, class: {}, domProps: {}}, n && n.data);
}

function recurse(node, filter, onMatch, parent) {
  if (parent && filter(node)) onMatch(node, parent); // never onMatch(rootNode)
  if (node.children && node.children.length) {
    node.children.forEach(n => recurse(n, filter, onMatch, node));
  }
}

const adapter = {
  isTag(node) {
    return !!node.tag;
  },
  existsOne(test, nodes) {
    return nodes.some(node => {
      const children = (node.children || []).map(adapter.isTag);
      return test(node) || adapter.existsOne(test, children);
    });
  },
  getAttributeValue(node, attr) {
    if (attr === "class") return vNodeClass(node);
    return node.data && node.data.attrs && node.data.attrs[attr];
  },
  getChildren(node) {
    return (node.children || []).filter(adapter.isTag);
  },
  getName(node) {
    return node.tag;
  },
  getParent(node) {
    return node.__vnode_parent__;
  },
  getSiblings(node) {
    return node.__vnode_parent__ && node.__vnode_parent__.children || [];
  },
  getText(node) {
    return node.text;
  },
  hasAttrib(node, attr) {
    return node.data && node.data.attrs && (attr in node.data.attrs);
  },
  removeSubsets(nodes) {
    const seen = new Map();
    return nodes.filter(node => {
      for (let n = node; n; n = n.__vnode_parent__) {
        if (seen.has(n)) return false;
      }
      return seen.set(node, true);
    });
  },
  findAll(test, nodes) {
    const results = [];
    nodes.forEach(node => recurse(node, () => true, node => {
      if (adapter.isTag(node) && test(node)) results.push(node);
    }, true));
    return results;
  },
  findOne(test, nodes) {
    nodes.forEach(node => recurse(node, () => true, node => {
      if (adapter.isTag(node) && test(node)) return node;
    }, true));
  }
};

const Query = function (root) {
  const {splice, push, reduce, some} = Array.prototype;
  const self = {length: 0};

  if (isVue(root)) root = root._vnode;
  if (root) Object.assign(self, {length: 1, 0: root});

  function text(node) {
    let s = '';
    recurse(node, () => true, n => s += n.text || '');
    return s;
  }

  // Create `.__vnode_parent__` properties for the selector engine to use.
  // This is actually safe because we know that a vnode tree is always in the
  // same shape (children never added or removed) so it need only be done once.
  recurse(root, () => true, (node, parent) => node.__vnode_parent__ = parent);

  const ret = Object.create({
    // Traversal functions
    find(selector) {
      const allChildren = splice.call(this, 0, this.length).reduce((nodes, node) => {
        return nodes.concat(adapter.getChildren(node));
      }, []);
      const results = CSSselect(selector, allChildren, {adapter});
      results.forEach(node => push.call(this, node));
      return this;
    },
    first() {
      splice.call(this, 1, this.length);
      return this;
    },
    last() {
      splice.call(this, 0, Math.max(0, this.length - 1));
      return this;
    },
    // Node information functions
    text() {
      return reduce.call(this, (s, n) => s + text(n) || '', '');
    },
    attr(name) {
      return ndata(this[0]).attrs[name];
    },
    css(name) {
      return ndata(this[0]).style[name];
    },
    prop(name) {
      return ndata(this[0]).domProps[name];
    },
    hasClass(name) {
      return some.call(this, n => vNodeClass(n).trim().split(/\s+/).includes(name));
    }
  });

  return Object.assign(ret, self);
};

module.exports = Query;
