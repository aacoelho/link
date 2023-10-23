/**
 * @typedef {object} LinkToolData
 * @description Link Tool's input and output data format
 * @property {string} link — data url
 * @property {metaData} meta — fetched link data
 */

/**
 * @typedef {object} metaData
 * @description Fetched link meta data
 * @property {string} image - link's meta image
 * @property {string} title - link's meta title
 * @property {string} description - link's description
 */

/**
 * @typedef {object} LinkToolConfig
 * @property {string} endpoint - the endpoint for link data fetching
 * @property {object} headers - the headers used in the GET request
 */

import './index.css';
import 'url-polyfill';
import ajax from '@codexteam/ajax';
import { IconLink } from '@codexteam/icons';

/**
 * @typedef {object} UploadResponseFormat
 * @description This format expected from backend on link data fetching
 * @property {number} success  - 1 for successful uploading, 0 for failure
 * @property {metaData} meta - Object with link data.
 *
 * Tool may have any data provided by backend, currently are supported by design:
 * title, description, image, url
 */
export default class LinkTool {
  /**
   * Notify core that read-only mode supported
   *
   * @returns {boolean}
   */
  static get isReadOnlySupported() {
    return true;
  }

  /**
   * Get Tool toolbox settings
   * icon - Tool icon's SVG
   * title - title to show in toolbox
   *
   * @returns {{icon: string, title: string}}
   */
  static get toolbox() {
    return {
      icon: IconLink,
      title: 'Link',
    };
  }

  /**
   * Allow to press Enter inside the LinkTool input
   *
   * @returns {boolean}
   * @public
   */
  static get enableLineBreaks() {
    return true;
  }

    /**
     *
     * @returns {{EDIT: number, VIEW: number}}
     * @constructor
     */
    static get STATE() {
      return {
          EDIT:0,
          VIEW:1
      };
    }

  /**
   * @param {object} options - Tool constructor options fot from Editor.js
   * @param {LinkToolData} options.data - previously saved data
   * @param {LinkToolConfig} options.config - user config for Tool
   * @param {object} options.api - Editor.js API
   * @param {boolean} options.readOnly - read-only mode flag
   */
  constructor({ data, config, api, readOnly }) {
    this.api = api;
    this.readOnly = readOnly;

    /**
     * Tool's initial config
     */
    this.config = {
      endpoint: config.endpoint || '',
      headers: config.headers || {},
    };

    this.nodes = {
      wrapper: null,
      container: null,
      progress: null,
      button: null,
      input: null,
      inputHolder: null,
      linkContent: null,
      linkImage: null,
      linkTitle: null,
      linkDescription: null,
      linkText: null,
      state: LinkTool.STATE.EDIT
    };

    this._data = {
      link: '',
      meta: {},
    };

    this.data = data;
  }

  /**
   * Renders Block content
   *
   * @public
   *
   * @returns {HTMLDivElement}
   */
  render() {
    this.nodes.wrapper = this.make('div', this.CSS.baseClass);
    this.nodes.container = this.make('div', this.CSS.container);

    this.nodes.inputHolder = this.makeInputHolder();
    this.nodes.linkContent = this.prepareLinkPreview();

    /**
     * If Tool already has data, render link preview, otherwise insert input
     */
    if (Object.keys(this.data.meta).length) {
      this.nodes.container.appendChild(this.nodes.linkContent);
      this.showLinkPreview(this.data.meta);
    } else {
      this.showInputHolder();
    }

    this.nodes.wrapper.appendChild(this.nodes.container);

    return this.nodes.wrapper;
  }

  /**
   * Create Block's settings block
   *
   * @returns {array}
   */
  renderSettings() {
    const edit = {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 641 640"><path fill="#5C6B7A" fill-rule="nonzero" d="M161.356 300.658c16.535-17.067 39.341-26.17 63.288-26.17 23.946 0 46.752 9.103 63.857 26.17l6.842 6.258 12.543-12.516-6.841-6.258c-17.105-17.066-26.228-39.822-26.228-64.284 0-23.894 9.123-46.08 26.228-63.147l70.129-70.542C387.708 73.67 410.514 64 434.46 64c24.517 0 46.753 9.102 63.857 26.169l52.455 52.907C567.877 160.142 577 182.329 577 206.79c0 23.893-9.123 46.649-26.227 63.716l-70.13 69.973c-17.674 16.498-39.91 26.169-63.857 26.169-23.946 0-46.182-9.102-63.857-26.169l-5.702-6.827-13.113 12.516 6.271 6.827c16.535 16.497 26.227 39.822 26.227 63.715s-9.692 46.649-26.227 63.147l-68.989 69.973C253.722 566.33 231.486 576 207.54 576c-23.947 0-46.183-9.102-63.857-26.169l-52.455-52.338C74.123 479.858 65 457.671 65 433.21c0-23.893 9.123-46.08 26.227-63.147l70.13-69.404Zm232.054 0c12.543 12.515 35.35 12.515 48.463 0l68.989-69.974c6.842-6.826 10.263-14.79 10.263-23.893 0-9.102-3.421-17.635-10.263-23.893l-53.025-52.907c-5.701-6.258-14.824-9.671-23.946-9.671-9.123 0-17.675 3.413-23.947 9.671l-70.129 69.973c-6.272 6.827-9.692 14.792-9.692 23.894 0 9.102 3.42 17.635 9.692 24.462l6.842 6.258 32.499-32.427c10.263-10.809 28.508-10.809 39.91 0 10.834 10.809 10.834 28.445 0 39.822L386.569 294.4l6.842 6.258Zm-272.535 132.55c0 9.672 3.421 18.205 9.693 24.463l52.454 52.907c12.544 12.515 34.78 12.515 47.893 0l70.13-70.542c6.271-6.258 10.262-14.792 10.262-23.894 0-9.102-3.99-17.635-10.262-23.893l-6.272-6.827s-31.359 31.29-33.07 32.427c-10.832 10.809-28.507 10.809-39.34 0-11.403-10.809-11.403-28.445 0-39.822.57-1.707 32.499-32.427 32.499-32.427l-6.842-6.258c-5.702-6.826-14.824-10.24-23.946-10.24-9.123 0-17.675 3.982-23.947 10.24l-70.13 69.405c-5.7 7.395-9.122 15.36-9.122 24.462Z"/></svg>`,
      name: 'edit-url',
      label: 'Edit URL',
      toggle: 'edit',
      isActive: this.nodes.state === LinkTool.STATE.EDIT,
      onActivate: () => {
        this.changeState(this.nodes.state === 0 ? 1 : 0);
      },
    };

    return [edit];
  }

  changeState(state){
    switch (state) {
      case LinkTool.STATE.EDIT:
        this.hideLinkPreview();
        this.showInputHolder();

        break;
      case LinkTool.STATE.VIEW:
        this.startFetching();

        break;
    }
  }

  /**
   * Return Block data
   *
   * @public
   *
   * @returns {LinkToolData}
   */
  save() {
    return this.data;
  }

  /**
   * Validate Block data
   * - check if given link is an empty string or not.
   *
   * @public
   *
   * @returns {boolean} false if saved data is incorrect, otherwise true
   */
  validate() {
    return this.data.link.trim() !== '';
  }

  /**
   * Stores all Tool's data
   *
   * @param {LinkToolData} data - data to store
   */
  set data(data) {
    this._data = Object.assign({}, {
      link: data.link || this._data.link,
      meta: data.meta || this._data.meta,
    });
  }

  /**
   * Return Tool data
   *
   * @returns {LinkToolData}
   */
  get data() {
    return this._data;
  }

  /**
   * @returns {object} - Link Tool styles
   */
  get CSS() {
    return {
      baseClass: this.api.styles.block,
      input: this.api.styles.input,

      /**
       * Tool's classes
       */
      container: 'link-tool',
      containerLoading: 'link-tool--loading',
      containerLoaded: 'link-tool--loaded',
      containerEdit: 'link-tool--edit',
      containerView: 'link-tool--view',
      containerError: 'link-tool--error',
      inputEl: 'link-tool__input',
      inputHolder: 'link-tool__input-holder',
      inputError: 'link-tool__input-holder--error',
      linkContent: 'link-tool__content',
      linkContentRendered: 'link-tool__content--rendered',
      linkImage: 'link-tool__image',
      linkTitle: 'link-tool__title',
      linkDescription: 'link-tool__description',
      linkText: 'link-tool__anchor',
      button: 'link-tool__button',
      progress: 'link-tool__progress',
      progressLoading: 'link-tool__progress--loading',
      progressLoaded: 'link-tool__progress--loaded',
    };
  }

  /**
   * Prepare input holder
   *
   * @returns {HTMLElement}
   */
  makeInputHolder() {
    const inputHolder = this.make('div', this.CSS.inputHolder);

    this.nodes.progress = this.make('label', this.CSS.progress);
    this.nodes.input = this.make('div', [this.CSS.input, this.CSS.inputEl], {
      contentEditable: !this.readOnly,
    });
    this.nodes.button = this.make('button', this.CSS.button);
    this.nodes.button.innerHTML = this.api.i18n.t('Add weblink');

    this.nodes.input.dataset.placeholder = this.api.i18n.t('Paste or type URL and press enter to add it');

    if (!this.readOnly) {
      this.nodes.button.addEventListener('click', (event) => {
        this.startFetching(event);
      });
      this.nodes.input.addEventListener('paste', (event) => {
        this.startFetching(event);
      });

      this.nodes.input.addEventListener('keydown', (event) => {
        const [ENTER, A] = [13, 65];
        const cmdPressed = event.ctrlKey || event.metaKey;

        switch (event.keyCode) {
          case ENTER:
            event.preventDefault();
            event.stopPropagation();

            this.startFetching(event);
            break;
          case A:
            if (cmdPressed) {
              this.selectLinkUrl(event);
            }
            break;
        }
      });
    }

    inputHolder.appendChild(this.nodes.progress);
    inputHolder.appendChild(this.nodes.input);
    inputHolder.appendChild(this.nodes.button);

    return inputHolder;
  }

  /**
   * Activates link data fetching by url
   *
   * @param {PasteEvent|KeyboardEvent} event - fetching could be fired by a pase or keydown events
   */
  startFetching(event = {}) {
    let url = this.nodes.input.textContent;

    if (event.type === 'paste') {
      url = (event.clipboardData || window.clipboardData).getData('text');
    }

    this.removeErrorStyle();
    this.fetchLinkData(url);
  }

  /**
   * If previous link data fetching failed, remove error styles
   */
  removeErrorStyle() {
    this.nodes.container.classList.remove(this.CSS.containerError);
    this.nodes.inputHolder.classList.remove(this.CSS.inputError);
    this.nodes.inputHolder.insertBefore(this.nodes.progress, this.nodes.input);
  }

  /**
   * Select LinkTool input content by CMD+A
   *
   * @param {KeyboardEvent} event - keydown
   */
  selectLinkUrl(event) {
    event.preventDefault();
    event.stopPropagation();

    const selection = window.getSelection();
    const range = new Range();

    const currentNode = selection.anchorNode.parentNode;
    const currentItem = currentNode.closest(`.${this.CSS.inputHolder}`);
    const inputElement = currentItem.querySelector(`.${this.CSS.inputEl}`);

    range.selectNodeContents(inputElement);

    selection.removeAllRanges();
    selection.addRange(range);
  }

  /**
   * Prepare link preview holder
   *
   * @returns {HTMLElement}
   */
  prepareLinkPreview() {
    const holder = this.make('a', this.CSS.linkContent, {
      target: '_blank',
      rel: 'nofollow noindex noreferrer',
    });

    this.nodes.linkImage = this.make('div', this.CSS.linkImage);
    this.nodes.linkTitle = this.make('div', this.CSS.linkTitle);
    this.nodes.linkDescription = this.make('p', this.CSS.linkDescription);
    this.nodes.linkText = this.make('span', this.CSS.linkText);

    return holder;
  }

  /**
   * Compose link preview from fetched data
   *
   * @param {metaData} meta - link meta data
   */
  showLinkPreview({ image, title, description }) {
    this.nodes.state = LinkTool.STATE.VIEW;
    this.nodes.container.appendChild(this.nodes.linkContent);
    this.nodes.container.classList.add(this.CSS.containerView);
    this.nodes.container.classList.remove(this.CSS.containerEdit);

    if (image && image.url) {
      this.nodes.linkImage.style.backgroundImage = 'url(' + image.url + ')';
      this.nodes.linkContent.appendChild(this.nodes.linkImage);
    }

    if (title) {
      this.nodes.linkTitle.textContent = title;
      this.nodes.linkContent.appendChild(this.nodes.linkTitle);
    }

    if (description) {
      this.nodes.linkDescription.textContent = description;
      this.nodes.linkContent.appendChild(this.nodes.linkDescription);
    }

    this.nodes.linkContent.classList.add(this.CSS.linkContentRendered);
    this.nodes.linkContent.setAttribute('href', this.data.link);
    this.nodes.linkContent.appendChild(this.nodes.linkText);

    try {
      this.nodes.linkText.textContent = (new URL(this.data.link)).hostname;
    } catch (e) {
      this.nodes.linkText.textContent = this.data.link;
    }
  }

  /**
   * Remove link preview from fetched data
   */
  hideLinkPreview() {
    this.nodes.container.removeChild(this.nodes.linkContent);
  }

  /**
   * Compose input holder
   */
  showInputHolder() {
    this.nodes.state = LinkTool.STATE.EDIT;
    this.nodes.container.appendChild(this.nodes.inputHolder);
    this.nodes.container.classList.remove(this.CSS.containerLoaded);
    this.nodes.progress.classList.remove(this.CSS.progressLoaded);
    this.nodes.container.classList.remove(this.CSS.containerView);
    this.nodes.container.classList.add(this.CSS.containerEdit);
  }

/**
   * Remove input holder
   */
  hideInputHolder() {
    this.nodes.container.removeChild(this.nodes.inputHolder);
  }

  /**
   * Show loading progress bar
   */
  showProgress() {
    this.nodes.container.classList.add(this.CSS.containerLoading);
    this.nodes.progress.classList.add(this.CSS.progressLoading);
  }

  /**
   * Hide loading progress bar
   *
   * @returns {Promise<void>}
   */
  hideProgress() {
    return new Promise((resolve) => {
      this.nodes.container.classList.remove(this.CSS.containerLoading);
      this.nodes.progress.classList.remove(this.CSS.progressLoading);
      this.nodes.container.classList.add(this.CSS.containerLoaded);
      this.nodes.progress.classList.add(this.CSS.progressLoaded);

      setTimeout(resolve, 500);
    });
  }

  /**
   * If data fetching failed, set input error style
   */
  applyErrorStyle() {
    this.nodes.container.classList.add(this.CSS.containerError);
    this.nodes.container.classList.remove(this.CSS.containerLoading);
    this.nodes.inputHolder.classList.add(this.CSS.inputError);
    this.nodes.progress.remove();
  }

  /**
   * Sends to backend pasted url and receives link data
   *
   * @param {string} url - link source url
   */
  async fetchLinkData(url) {
    this.showProgress();
    this.data = { link: url };

    try {
      const { body } = await (ajax.get({
        url: this.config.endpoint,
        headers: this.config.headers,
        data: {
          url,
        },
      }));

      this.onFetch(body);
    } catch (error) {
      this.fetchingFailed(this.api.i18n.t('Couldn\'t fetch the link data'));
    }
  }

  /**
   * Link data fetching callback
   *
   * @param {UploadResponseFormat} response - backend response
   */
  onFetch(response) {
    if (!response || !response.success) {
      this.fetchingFailed(this.api.i18n.t('Couldn\'t get this link data, try the other one'));

      return;
    }

    const metaData = response.meta;

    const link = response.link || this.data.link;

    this.data = {
      meta: metaData,
      link,
    };

    if (!metaData) {
      this.fetchingFailed(this.api.i18n.t('Wrong response format from the server'));

      return;
    }

    this.hideProgress().then(() => {
      this.hideInputHolder();
      this.showLinkPreview(metaData);
    });
  }

  /**
   * Handle link fetching errors
   *
   * @private
   *
   * @param {string} errorMessage - message to explain user what he should do
   */
  fetchingFailed(errorMessage) {
    this.api.notifier.show({
      message: errorMessage,
      style: 'error',
    });

    this.applyErrorStyle();
  }

  /**
   * Helper method for elements creation
   *
   * @param {string} tagName - name of creating element
   * @param {string|string[]} [classNames] - list of CSS classes to add
   * @param {object} [attributes] - object with attributes to add
   * @returns {HTMLElement}
   */
  make(tagName, classNames = null, attributes = {}) {
    const el = document.createElement(tagName);

    if (Array.isArray(classNames)) {
      el.classList.add(...classNames);
    } else if (classNames) {
      el.classList.add(classNames);
    }

    for (const attrName in attributes) {
      el[attrName] = attributes[attrName];
    }

    return el;
  }
}
