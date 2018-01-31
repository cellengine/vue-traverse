# Why?

Currently [vue-test-utils](https://github.com/vuejs/vue-test-utils) must have a DOM to be used, but Vue does not! Contrary to what you might expect, Vue is not very much concerned with the DOM, except in one layer which runs when loaded inside a web browser. Due to this good design, a Vue component can be loaded in Node and you can set the props, call methods, and add listeners in a 100% supported way.

With `vue-traverse` you can now use a jQuery-like API to test that your template is behaving correctly as state changes, without reliance on jsdom or a web browser. This is thanks to Vue's documented [VDOM](https://vuejs.org/v2/guide/render-function.html#The-Virtual-DOM) (which is based on [snabbdom](https://github.com/snabbdom/snabbdom)).

This mixes well with [vue-toolchain](https://github.com/primitybio/vue-toolchain) which allows you to easily `require()` a `.vue` file in mocha ([see here](https://github.com/primitybio/vue-toolchain#vue-toolchainregister)).

# Usage

```javascript
const Query = require('vue-traverse');
const Vue = require('vue');
const expect = require('chai').expect;
const ConfirmDialog = require('./ConfirmDialog.vue').default;

const vm = new Vue(ConfirmDialog);
vm.text = 'Are you sure?';
vm.warn = true;
vm.$mount();

expect(Query(vm).hasClass('confirm-dialog')).to.be.true;
expect(Query(vm).find('.confirm-dialog__text').text()).to.equal('Are you sure?');
expect(Query(vm).find('.confirm-dialog__wrapper').hasClass('confirm-dialog__wrapper--is-warning')).to.be.true

```

# API

These methods should behave just like good old jQuery. You can pretend that you're working on HTMLElements, even though internally you're inspecting the VDOM tree.

**Traversal**
* `find(selector)` - reduce the set of matched elements to those that match `selector`
* `first()` - reduce the set of matched elements to the first one in the set
* `last()` - reduce the set of matched elements to the last one in the set

**Getters**
* `text()` - returns the text content of all elements in the set, and children
* `attr(name)` - value of the first element's `v-bind:name`
* `css(name)` - value of `name` in the first element's `v-bind:style` object
* `prop(name)` - value of `name` in the first element's `v-bind.prop:name` value
* `hasClass(name)` - true if the element has this class via `class=` or `v-bind:class="{}"`
