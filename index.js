const cssauron = require('cssauron');
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

const SelectorFactory = cssauron({
  tag: 'tag',
  class: node => vNodeClass(node),
  id: node => node.data && node.data.attrs && node.data.attrs.id,
  children: 'children',
  parent: '__vnode_parent__',
  contents: 'text',
  attr(node, attr) {
    if (node.data) {
      const {attrs = {}, props = {}} = node.data;
      if (attrs[attr]) return attrs[attr];
      if (props[attr]) return props[attr];
    }
  }
});

const Query = function (root) {
  const {splice, push, reduce, some} = Array.prototype;
  const self = {length: 0};

  if (isVue(root)) root = root._vnode;
  if (root) Object.assign(self, {length: 1, 0: root});

  function recurse(node, filter, onMatch, parent) {
    if (parent && filter(node)) onMatch(node, parent); // never onMatch(rootNode)
    if (node.children && node.children.length) {
      node.children.forEach(n => recurse(n, filter, onMatch, node));
    }
  }

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
      const filter = SelectorFactory(selector);
      splice.call(this, 0, this.length).forEach(node => {
        recurse(node, filter, n => push.call(this, n));
      });
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
      return some.call(this, n => n.staticClass === name || ndata(n).class[name]);
    }
  });

  return Object.assign(ret, self);
};

module.exports = Query;
