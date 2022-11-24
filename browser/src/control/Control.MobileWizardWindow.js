/* -*- js-indent-level: 8 -*- */
/*
 * L.Control.MobileWizardWindow - contains one unique window instance inside mobile-wizard
 */

/* global app $ w2ui */
L.Control.MobileWizardWindow = L.Control.extend({
	options: {
		maxHeight: '45vh',
		snackbarTimeout: 6000
	},

	_builder: null,
	_inMainMenu: true,
	_isActive: false,
	_inBuilding: false,
	_currentDepth: 0,
	_mainTitle: '',
	_customTitle: false,
	_isTabMode: false,
	_currentPath: [],
	_tabs: [],
	_currentScrollPosition: 0,
	_isPopup: false,

	initialize: function (mobileWizard, id) {
		L.setOptions(this, this.options);
		this.id = id;
		this.parent = mobileWizard;
		this.isVisible = false;

		var parent = document.getElementById('mobile-wizard-content');
		this.content = L.DomUtil.create('div', 'mobile-wizard mobile-wizard-content', parent);
		this.content.id = this.id;
	},

	onAdd: function (map) {
		this.map = map;

		// for the moment, the mobile-wizard is mobile phone only
		if (!window.mode.isMobile())
			return;

		this._setupBackButton();
	},

	onRemove: function() {
		L.DomUtil.remove(this.content);
		this.content = undefined;
	},

	_reset: function() {
		this._currentDepth = 0;
		this._inMainMenu = true;
		this.content.innerHTML = '';
		this.backButton.show();
		this.backButton.addClass('close-button');
		$('#mobile-wizard-tabs').empty();
		$('#mobile-wizard-tabs').hide();
		$('#mobile-wizard-titlebar').show();
		$('#mobile-wizard-titlebar').css('top', '0px');
		$('#mobile-wizard').removeClass('menuwizard');
		$('#mobile-wizard').removeClass('funcwizard');
		$('#mobile-wizard').removeClass('popup');
		$('#mobile-wizard').removeClass('snackbar');
		this._isTabMode = false;
		this._currentPath = [];
		this._tabs = [];
		this._currentScrollPosition = 0;
		this._isPopup = false;
	},

	_setupBackButton: function() {
		this.content.innerHTML = '';
		this.backButton = $('#mobile-wizard-back');
		$(this.backButton).addClass('close-button');
	},

	hideWindow: function() {
		this.isVisible = false;
		$(this.content).hide();
	},

	showWindow: function() {
		this.isVisible = true;
		$(this.content).show();
	},

	_showWizard: function() {
		if (this.snackBarTimout)
			clearTimeout(this.snackBarTimout);

		this.isVisible = true;

		this.scrollIndicator = $('<div class="mobile-wizard-scroll-indicator" id="mobile-wizard-scroll-indicator-' + this.id + '" style="width: 100%;height: 0px;position: fixed;z-index: 2;bottom: -7px;box-shadow: 0 -8px 20px 4px #0b87e770, 0 1px 10px 6px #0b87e7;"></div>');
		$(this.content).append(this.scrollIndicator);

		var wizard = $('#mobile-wizard');
		wizard.show();
		var that = this;
		wizard.on('scroll', function() {
			var mWizardContentScroll = wizard.scrollTop();
			var height = wizard.prop('scrollHeight');
			var contentHeight = wizard.prop('clientHeight');
			var scrollLeft = height - mWizardContentScroll;
			if (scrollLeft < contentHeight + 1 || !that.isVisible) { that.scrollIndicator.css('display','none'); }
			else { that.scrollIndicator.css('display','block'); }
		});
		$('#toolbar-down').hide();
		if (window.ThisIsTheAndroidApp)
			window.postMobileMessage('MOBILEWIZARD show');
		if (window.mobileMenuWizard)
			this.map.showSidebar = false;

		var stb = document.getElementById('spreadsheet-toolbar');
		if (stb)
			stb.style.display = 'none';

		if (!document.getElementById('document-container').classList.contains('landscape')) {
			var pcw = document.getElementById('presentation-controls-wrapper');
			if (pcw)
				pcw.style.display = 'none';
		}
	},

	isOpen: function() {
		return $('#mobile-wizard').is(':visible');
	},

	_hideKeyboard: function() {
		this.map.blur();
	},

	getCurrentLevel: function() {
		return this._currentDepth;
	},

	setTabs: function(tabs) {
		this._tabs = tabs;
		$('#mobile-wizard-tabs').show();
		$('#mobile-wizard-tabs').empty();
		$('#mobile-wizard-tabs').append(tabs);
		$('#mobile-wizard-titlebar').hide();
		this._isTabMode = true;
	},

	setCurrentScrollPosition: function() {
		this._currentScrollPosition = $(this.content).scrollTop();
	},

	goLevelDown: function(contentToShow, options) {
		var animate = (options && options.animate != undefined) ? options.animate : true;

		if (!this._isTabMode || this._currentDepth > 0)
			this.backButton.removeClass('close-button');

		if (this._isTabMode && this._currentDepth > 0) {
			$('#mobile-wizard-titlebar').show();
			$('#mobile-wizard-tabs').hide();
		}

		$('#mobile-wizard .ui-effects-placeholder').hide();

		var nodesToHide = $(contentToShow).siblings().not('.mobile-wizard-scroll-indicator');

		var parent = $(contentToShow).parent();
		if (parent.hasClass('toolbox'))
			nodesToHide = nodesToHide.add(parent.siblings().not('.mobile-wizard-scroll-indicator'));

		var duration = 10;
		if (animate) {
			nodesToHide.hide('slide', { direction: 'left' }, duration);
			// be sure all is hidden, sometimes jQuery doesn't work here ...
			// restoreStyle is called in some jQuery cleanup what causes showing nodes again
			setTimeout(function() { nodesToHide.hide(); }, duration + 5);
		}
		else
			nodesToHide.hide();

		$(contentToShow).children('.ui-header').hide();

		$('#mobile-wizard.funcwizard div#mobile-wizard-content').removeClass('hideHelpBG');
		$('#mobile-wizard.funcwizard div#mobile-wizard-content').addClass('showHelpBG');

		if (animate)
			$(contentToShow).children('.ui-content').first().show('slide', { direction: 'right' }, 'fast');
		else
			$(contentToShow).children('.ui-content').first().show();

		this._currentDepth++;
		if (!this._inBuilding)
			history.pushState({context: 'mobile-wizard', level: this._currentDepth}, 'mobile-wizard-level-' + this._currentDepth);

		var title = $(contentToShow).children('.ui-content').get(0).title;

		if (this._customTitle)
			this._setCustomTitle(this._customTitle);
		else
			this._setTitle(title);

		this._inMainMenu = false;

		this._currentPath.push(title);
	},

	goLevelUp: function() {
		this._currentPath.pop();
		if (this._inMainMenu || (this._isTabMode && this._currentDepth == 1
			&& !this.map.dialog.hasDialogInMobilePanelOpened)) {
			this.parent.removeWindow(this);
			this._currentDepth = 0;
			if (window.mobileWizard === true) {
				w2ui['actionbar'].click('mobile_wizard');
			} else if (window.insertionMobileWizard === true) {
				w2ui['actionbar'].click('insertion_mobile_wizard');
			} else if (window.mobileMenuWizard === true) {
				$('#main-menu-state').click();
			} else if (window.commentWizard === true) {
				w2ui['actionbar'].click('comment_wizard');
			} else if (window.contextMenuWizard) {
				window.contextMenuWizard = false;
				this.map.fire('closemobilewizard');
			}
		} else {
			this._currentDepth--;

			var parent = $('.ui-content.mobile-wizard:visible');
			if (this._currentDepth > 0 && parent)
				this._customTitle ? this._setCustomTitle(parent.get(0).customTitleBar) : this._setTitle(parent.get(0).title);
			else
				this._customTitle ? this._setCustomTitle(this._customTitle) : this._setTitle(this._mainTitle);

			var currentNode = $('.ui-explorable-entry.level-' + this._currentDepth + '.mobile-wizard:visible');
			var headers = currentNode.siblings();
			var currentHeader = currentNode.children('.ui-header');
			headers = headers.add(currentHeader);

			var parent = currentNode.parent();
			if (parent.hasClass('toolbox'))
				headers = headers.add(parent.siblings());

			headers = headers.not('.hidden');

			$('.ui-content.level-' + this._currentDepth + '.mobile-wizard:visible').hide();
			$('#mobile-wizard.funcwizard div#mobile-wizard-content').removeClass('showHelpBG');
			$('#mobile-wizard.funcwizard div#mobile-wizard-content').addClass('hideHelpBG');
			headers.show('slide', { direction: 'left' }, 'fast');

			if (this._currentDepth == 0 || (this._isTabMode && this._currentDepth == 1)) {
				this._inMainMenu = true;
				this.backButton.addClass('close-button');
				if (this._isTabMode) {
					$('#mobile-wizard-titlebar').hide();
					$('#mobile-wizard-tabs').show();
				}
			}
			if (window.commentWizard === true) {
				app.sectionContainer.getSectionWithName(L.CSections.CommentList.name).removeHighlighters();
			}
		}
	},

	_setTitle: function(title) {
		var right = $('#mobile-wizard-title');
		right.text(title);
	},

	_setCustomTitle: function(title) {
		var right = $('#mobile-wizard-title');
		right.html(title);
	},

	_scrollToPosition: function(position) {
		if (this._currentScrollPosition) {
			$(this.content).animate({ scrollTop: position }, 0);
		}
	},

	selectedTab: function(tabText) {
		if (this._currentPath && this._currentPath.length) {
			this._currentPath = [tabText];
		}
	},

	_selectTab: function(tabId) {
		if (this._tabs && tabId) {
			for (var index in this._tabs.children) {
				if (this._tabs.children[index].id === tabId) {
					$(this._tabs.children[index]).trigger('click', {animate: false});
					break;
				}
			}
		}
	},

	_goToPath: function(path) {
		// when dialog has tabs, tab selection triggers the callback, causes infinite regenetate loop
		if (this._tabs && path && path.length && !this.map.dialog.hasDialogInMobilePanelOpened())
			this._selectTab(path[0]);

		var _path = [];
		var goBack = false;

		for (var index in path) {
			var elem = $('[title=\'' + path[index] + '\'').prev();
			if (elem.length) {
				$(elem).trigger('click', {animate: false});
				_path.push(path[index]);
			}
			else
				goBack = true;
		}

		if (goBack) {
			this._currentScrollPosition = 0;
			$(this.content).animate({ scrollTop: 0 }, 0);
		}

		this._currentPath = _path;
	},

	_onMobileWizard: function(data, callback) {
		if (data) {
			if (data.jsontype === 'autofilter' && (data.visible === 'false' || data.visible === false))
				return;

			if (data.jsontype === 'dialog' && data.action === 'close') {
				this.parent.removeWindow(this, false);
				return;
			}

			this._inBuilding = true;

			var isDocumentAreaPopup = data.popupParent === '_POPOVER_'
				&& data.posx !== undefined && data.posy !== undefined;
			var isCalc = this.map._docLayer ? (this.map._docLayer._docType === 'spreadsheet') : false;
			var isAutofilter = isDocumentAreaPopup && isCalc;

			var isPopupJson = (data.type === 'modalpopup' || data.type === 'snackbar');
			// show autofilter as regular mobile wizard for compatibility with older version
			var isPopup = !isAutofilter && isPopupJson;
			var isSidebar = false;
			if (data.children) {
				for (var i in data.children) {
					if (data.children[i].type == 'deck')
						isSidebar = true;
				}
			}

			if (!this._isActive && isSidebar) {
				if (this.map.showSidebar == false)
					return;
			}
			if (isSidebar && !this.map.showSidebar) {
				return;
			}

			var isMobileDialog = data.id && !isNaN(data.id) && !isSidebar;
			if (isMobileDialog) {
				// id is a number - remember window id for interaction
				window.mobileDialogId = data.id;
				//dialogid is string - name of the dialog in json
				if (data.dialogid)
					this._dialogid = data.dialogid;
			}

			this._isActive = true;
			var currentPath = null;
			var lastScrollPosition = null;
			var alreadyOpen = this.isOpen();

			if (this._currentPath)
				currentPath = this._currentPath;
			if (this._currentScrollPosition)
				lastScrollPosition = this._currentScrollPosition;

			if (isPopup) {
				var popupContainer = $('.mobile-popup-container:visible');
				if (popupContainer.length) {
					// for menubutton we inject popup into menu structure
					if (data.action === 'close' || data.action === 'fadeout') {
						this.goLevelUp();
						popupContainer.empty();
					} else {
						this.backButton.hide();
						popupContainer.empty();
						if (!this._builder)
							this._builder = L.control.mobileWizardBuilder({windowId: data.id, mobileWizard: this, map: this.map, cssClass: 'mobile-wizard'});
						this._builder.build(popupContainer.get(0), [data]);
					}

					this._inBuilding = false;
					return;
				} else if (data.action === 'close' || data.action === 'fadeout') {
					this.parent.removeWindow(this);
					return;
				} else {
					// normal popup - continue to open mobile wizard
					var overlay = L.DomUtil.create('div', 'mobile-wizard jsdialog-overlay ' + (data.cancellable ? 'cancellable' : ''), document.body);
					var that = this;
					if (data.cancellable)
						overlay.onclick = function () { that.parent.removeWindow(that); };
				}
			}

			this._reset();
			this._isPopup = isPopupJson;

			this._showWizard();
			if (this.map._docLayer && !this.map._docLayer.isCalc()) {
				// In Calc, the wizard is used for the formulas,
				// and it's easier to allow the user to search
				// for a formula by typing the first few characters.
				this._hideKeyboard();
			}

			// Morph the sidebar into something prettier
			if (isSidebar)
				this._modifySidebarLayout(data);

			if (!alreadyOpen) {
				history.pushState({context: 'mobile-wizard'}, 'mobile-wizard-opened');
				history.pushState({context: 'mobile-wizard', level: 0}, 'mobile-wizard-level-0');
			}

			if (!this._builder)
				this._builder = L.control.mobileWizardBuilder({windowId: data.id, mobileWizard: this, map: this.map, cssClass: 'mobile-wizard', callback: callback});
			this._builder.build(this.content, [data]);
			if (window.ThisIsTheAndroidApp)
				window.postMobileMessage('hideProgressbar');

			this._mainTitle = data.text ? data.text : '';
			this._customTitle = data.customTitle;

			this._customTitle ? this._setCustomTitle(this._customTitle) : this._setTitle(this._mainTitle);

			if (data.id === 'menubar' || data.id === 'insertshape') {
				document.getElementById('mobile-wizard').style.height = '100vh';
				if (data.id === 'menubar')
					$('#mobile-wizard').addClass('menuwizard');
				else if (data.id === 'insertshape') {
					$('#mobile-wizard').addClass('shapeswizard');
				}
				$('#mobile-wizard').css('top', $('#document-container').css('top'));
			} else if (data.id === 'funclist') {
				document.getElementById('mobile-wizard').style.height = '100vh';
				$('#mobile-wizard').css('top', $('#document-container').css('top'));
				$('#mobile-wizard').addClass('funcwizard');
			} else {
				document.getElementById('mobile-wizard').style.height = this.options.maxHeight;
				$('#mobile-wizard').css('top', '');
			}
			if (!this.map._docLoaded && !isPopup) {
				$('#mobile-wizard').height('100%');
				// Turn backButton icon from down to actually back
				// since it does not hide it, instead it goes back in this case
				this.backButton.removeClass('close-button');
			}
			if (this._isActive && currentPath.length) {
				this._goToPath(currentPath);
				this._scrollToPosition(lastScrollPosition);
			}

			if (isPopup) {
				// force hide scroll indicator while its showing/hidding is not fixed
				$('.mobile-wizard-scroll-indicator').hide();

				$('#mobile-wizard').addClass('popup');
				$('#mobile-wizard-titlebar').hide();

				if (data.type === 'snackbar') {
					var that = this;
					$('#mobile-wizard').addClass('snackbar');
					this.snackBarTimout = setTimeout(function () { that.parent.removeWindow(that); }, this.options.snackbarTimeout);
				}
			}

			this._inBuilding = false;
		}
	},

	_isSlidePropertyPanel: function(data) {
		var backgroundPanel = L.LOUtil.findItemWithAttributeRecursive(data, 'id', 'SlideBackgroundPanel');
		var layoutPanel = L.LOUtil.findItemWithAttributeRecursive(data, 'id', 'SdLayoutsPanel');
		return backgroundPanel && layoutPanel;
	},

	_insertCalcBorders: function(deck) {
		var replaceMe = L.LOUtil.findItemWithAttributeRecursive(deck, 'id', 'cellbordertype');
		if (replaceMe) {
			replaceMe.id = 'borderstyle';
			replaceMe.type = 'borderstyle';
			replaceMe.text = '';
			replaceMe.enabled = 'true';
			replaceMe.children = [];
		}
	},

	_modifySidebarLayout: function (data) {
		if (data.children && data.children.length && data.children[0].type !== 'deck')
			data.children.splice(0, 1);

		var deck = L.LOUtil.findItemWithAttributeRecursive(data, 'type', 'deck');
		if (deck)
		{
			// merge styles into text-panel for elegance
			var stylesIdx = L.LOUtil.findIndexInParentByAttribute(deck, 'id', 'StylesPropertyPanel');
			var textIdx = L.LOUtil.findIndexInParentByAttribute(deck, 'id', 'TextPropertyPanel');

			if (stylesIdx >= 0 && this.map.getDocType() === 'spreadsheet')
			{       // remove rather useless calc styles panel
				deck.children.splice(stylesIdx, 1);
			}
			else if (stylesIdx >= 0 && textIdx >= 0)
			{
				var moveContent = deck.children[stylesIdx].children[0].children;
				deck.children[textIdx].children[0].children = moveContent.concat(deck.children[textIdx].children[0].children);
				deck.children.splice(stylesIdx, 1); //remove the styles property
			}
			var removeItems = ['borderlinestyle', 'editcontour', 'spacingbar',
					   'linespacing', 'stylenew', 'styleupdate',
					   'beginarrowstyle', 'endarrowstyle'];

			if (this.map.getDocType() === 'presentation')
				removeItems.push('indentfieldbox');

			this._removeItems(deck, removeItems);

			this._insertCalcBorders(deck);
		}
	},

	_removeItems: function (data, items) {
		if (data.children) {
			for (var i = 0; i < data.children.length;) {
				var childRemoved = false;
				for (var j = 0; j < items.length; j++) {
					if (data.children[i].id === items[j]) {
						data.children.splice(i, 1);
						childRemoved = true;
						break;
					}
				}
				if (!childRemoved)
				{
					if (data.children[i])
						this._removeItems(data.children[i], items);
					i++;
				}
			}
		}
	},

	onJSUpdate: function (e) {
		var data = e.data;

		if (data.jsontype === 'notebookbar')
			return;

		var container = this.content;
		if (!container)
			return;

		var control = container.querySelector('[id=\'' + data.control.id + '\']');
		if (!control) {
			window.app.console.warn('jsdialogupdate: not found control with id: "' + data.control.id + '"');
			return;
		}

		var parent = control.parentNode;
		if (!parent)
			return;

		var scrollTop = control.scrollTop;
		var wasHidden = control.style.display === 'none';

		control.style.visibility = 'hidden';
		if (!this._builder)
			return;

		this._inBuilding = true;

		// preserve the same level for control
		var classList = control.className.split(' ');
		var currentLevel = null;
		for (var i in classList) {
			if (classList[i].indexOf('level-') >= 0) {
				currentLevel = classList[i];
				break;
			}
		}

		if (currentLevel) {
			currentLevel = currentLevel.substring('level-'.length);
			this._builder._currentDepth = currentLevel;
		}

		var temporaryParent = L.DomUtil.create('div');
		this._builder.build(temporaryParent, [data.control], false);
		parent.insertBefore(temporaryParent.firstChild, control.nextSibling);
		L.DomUtil.remove(control);

		// when we updated toolbox or menubutton with color picker we need to leave
		// mobile wizard at the same level (opened color picker) on update
		if (this._currentPath.length) {
			var elem = $('[title=\'' + this._currentPath[this._currentPath.length - 1] + '\'').prev(':visible');
			if (elem.length) {
				// we already were at this level so go back one step and enter again
				this._currentPath.pop();
				this._currentDepth--;
				$(elem).trigger('click', {animate: false});
			}
		}

		var newControl = container.querySelector('[id=\'' + data.control.id + '\']');
		if (newControl) {
			if (wasHidden)
				newControl.style.display = 'none';

			newControl.scrollTop = scrollTop;
		}

		// avoid scrolling when adding new bigger elements to the view
		$(this.content).animate({ scrollTop: this._currentScrollPosition }, 0);

		this._inBuilding = false;
	},

	onJSAction: function (e) {
		var data = e.data;

		if (data.jsontype === 'notebookbar')
			return;

		if (!this._builder)
			return;

		if (!this.content)
			return;

		// Panels share the same name for main containers, do not execute actions for them
		// if panel has to be shown or hidden, full update will appear
		if (data.data && data.jsontype === 'sidebar' &&
			(data.data.control_id === 'contents' ||
			data.data.control_id === 'Panel' ||
			data.data.control_id === 'titlebar')) {
			window.app.console.log('Ignored action: ' + data.data.action_type + ' for control: ' + data.data.control_id);
			return;
		}

		this._builder.executeAction(this.content, data.data);
	},
});

L.control.mobileWizardWindow = function (mobileWizard, id) {
	return new L.Control.MobileWizardWindow(mobileWizard, id);
};
