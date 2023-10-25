/* global describe it beforeEach require afterEach cy */

var helper = require('../../common/helper');
var impressHelper = require('../../common/impress_helper');
var desktopHelper = require('../../common/desktop_helper');
var repairHelper = require('../../common/repair_document_helper');
var ceHelper = require('../../common/contenteditable_helper');

describe(['tagdesktop'], 'Editing Operations', function() {
	var testFileName = 'undo_redo.odp';

	beforeEach(function() {
		helper.beforeAll(testFileName, 'impress');
		desktopHelper.switchUIToCompact();
		desktopHelper.selectZoomLevel('30');
		impressHelper.selectTextShapeInTheCenter();
		impressHelper.selectTextOfShape(false);
		cy.wait(1000);
		cy.cGet('div.clipboard').as('clipboard');
		ceHelper.checkAccessibilitySupport(true);
		// ceHelper.checkHasAnySelection(true);
		// ceHelper.checkIsEditingInSelection(true);
	});

	afterEach(function() {
		helper.afterAll(testFileName, this.currentTest.state);
	});

	function undo() {
		helper.typeIntoDocument('Hello World');
		cy.wait(1000);
		// ceHelper.checkIsInputPrevented(false);
		impressHelper.selectTextOfShape();
		helper.typeIntoDocument('{ctrl}z');
		impressHelper.selectTextOfShape();
		helper.clipboardTextShouldBeDifferentThan('Hello World');
		ceHelper.checkLog();
	}

	it.only('Undo', function() {
		undo();
	});

	it('Redo', function() {
		undo();
		helper.typeIntoDocument('{ctrl}y');
		impressHelper.selectTextOfShape();
		helper.expectTextForClipboard('Hello World');
	});

	it('Repair Document', function() {
		helper.typeIntoDocument('Hello World');
		impressHelper.triggerNewSVGForShapeInTheCenter();
		impressHelper.selectTextOfShape();
		helper.typeIntoDocument('Overwrite Text');
		impressHelper.triggerNewSVGForShapeInTheCenter();
		repairHelper.rollbackPastChange('Undo');
		impressHelper.triggerNewSVGForShapeInTheCenter();
		impressHelper.selectTextOfShape();
		helper.expectTextForClipboard('Hello World');
	});
});
