// Form components are namespaced under 'fba' = 'Feedback Analytics'
// Updated: July 2024
'use strict';

function FBAform(d, N) {
	return {
		formComponent: function() {
			return d.querySelector("[data-touchpoints-form-id='" + this.options.formId + "']")
		},
		formElement: function() {
			return this.formComponent().querySelector("form");
		},
		activatedButton: null, // tracks a reference to the button that was clicked to open the modal
		isFormSubmitted: false, // defaults to false
		// enable Javascript experience
		javascriptIsEnabled: function() {
			var javascriptDisabledMessage = d.getElementsByClassName("javascript-disabled-message")[0];
			var touchpointForm = d.getElementsByClassName("touchpoint-form")[0];
			if (javascriptDisabledMessage) {
				javascriptDisabledMessage.classList.add("hide");
			}
			if (touchpointForm) {
				touchpointForm.classList.remove("hide");
			}
		},
		init: function(options) {
			this.javascriptIsEnabled();
			this.options = options;
			if (this.options.loadCSS) {
				this._loadCss();
			}
			this._loadHtml();
			if (!this.options.suppressUI && (this.options.deliveryMethod && this.options.deliveryMethod === 'modal')) {
				this.loadButton();
			}
			this._bindEventListeners();
			this.dialogOpen = false; // initially false
			this.successState = false; // initially false
			this._pagination();
			if (this.options.formSpecificScript) {
				this.options.formSpecificScript();
			}
			d.dispatchEvent(new CustomEvent('onTouchpointsFormLoaded', {
				detail: {
					formComponent: this
				}
			}));
			return this;
		},
		_bindEventListeners: function() {
			var self = this;
			d.addEventListener('keyup', function (event) {
				var x = event.keyCode;
				if( x == 27 && self.dialogOpen == true) {
					self.closeDialog();
				}
			});
			d.addEventListener('click', function (event) {
				self.openModalDialog(event);
			});

			const textareas = this.formComponent().querySelectorAll(".usa-textarea");
			textareas.forEach(function(textarea) {
				if (textarea.getAttribute("maxlength") != '0' && textarea.getAttribute("maxlength") != '10000')  {
					textarea.addEventListener("keyup", self.textCounter);
				}
			});

			const textFields = this.formComponent().querySelectorAll(".usa-input[type='text']");
			textFields.forEach(function(textField) {
				if (textField.getAttribute("maxlength") != '0' && textField.getAttribute("maxlength") != '10000')  {
					textField.addEventListener("keyup", self.textCounter);
				}
			});

		},
		_loadCss: function() {
			if (this.options.loadCSS) {
				var style = d.createElement('style');
				style.innerHTML = this.options.css;
				d.head.appendChild(style);
			}
		},
		_loadHtml: function() {
		if ((this.options.deliveryMethod && this.options.deliveryMethod === 'inline') && this.options.suppressSubmitButton) {
			if (this.options.elementSelector) {
				if(d.getElementById(this.options.elementSelector) != null) {
					d.getElementById(this.options.elementSelector).innerHTML = this.options.htmlFormBodyNoModal();
				}
			}
		} else if (this.options.deliveryMethod && this.options.deliveryMethod === 'inline') { 
			if (this.options.elementSelector) {
				if(d.getElementById(this.options.elementSelector) != null) {
					d.getElementById(this.options.elementSelector).innerHTML = this.options.htmlFormBody();
				}
			}
		}
		if (this.options.deliveryMethod && (this.options.deliveryMethod === 'modal' || this.options.deliveryMethod === 'custom-button-modal')) {
			this.dialogEl = d.createElement('div');
			this.dialogEl.setAttribute("hidden", true);
			this.dialogEl.setAttribute("aria-hidden", true);
			this.dialogEl.setAttribute('class', 'fba-modal');
			this.dialogEl.setAttribute('data-touchpoints-form-id', this.options.formId);

			this.dialogEl.innerHTML = this.options.htmlFormBody();
			d.body.appendChild(this.dialogEl);

			this.formComponent().querySelector('.fba-modal-close').addEventListener('click', this.handleDialogClose.bind(this), false);
		}
		var otherElements = this.formElement().querySelectorAll(".usa-input.other-option");
		for (var i = 0; i < otherElements.length; i++) {
		    otherElements[i].addEventListener('keyup', this.handleOtherOption.bind(this), false);
		}
		var phoneElements = this.formElement().querySelectorAll("input[type='tel']");
		for (var i = 0; i < phoneElements.length; i++) {
		    phoneElements[i].addEventListener('keyup', this.handlePhoneInput.bind(this), false);
		}
		if (this.options.deliveryMethod && this.options.deliveryMethod === 'custom-button-modal') {
			if (this.options.elementSelector) {
				if(d.getElementById(this.options.elementSelector) != null) {
					d.getElementById(this.options.elementSelector).addEventListener('click', this.handleButtonClick.bind(this), false);
				}
			}
		}

			var formElement = this.formElement();
			// returns 1 or more submit buttons within the Touchpoints form
			var submitButtons = formElement.querySelectorAll("[type='submit']");
			var that = this;

			var yesNoForm = formElement.querySelector('.touchpoints-yes-no-buttons');

			if (yesNoForm) { // only for yes/no questions
				Array.prototype.forEach.call(submitButtons, function(submitButton) {
					submitButton.addEventListener('click', that.handleYesNoSubmitClick.bind(that), false);
				})
			} else { // for all other types of forms/questions
				if (submitButtons) {
					Array.prototype.forEach.call(submitButtons, function(submitButton) {
						submitButton.addEventListener('click', that.handleSubmitClick.bind(that), false);
					})
				}
			}
		},
		resetErrors: function() {
			var formComponent = this.formComponent();
			var alertElement = formComponent.querySelector(".fba-alert");
			var alertElementHeading = formComponent.getElementsByClassName("usa-alert__heading")[0];
			var alertElementBody = formComponent.getElementsByClassName("usa-alert__text")[0];
			var alertErrorElement = formComponent.querySelector(".fba-alert-error");
			var alertErrorElementBody = alertErrorElement.getElementsByClassName("usa-alert__text")[0];
			alertElement.setAttribute("hidden", true);
			alertElementHeading.innerHTML = "";
			alertElementBody.innerHTML = "";
			alertErrorElement.setAttribute("hidden", true);
			alertErrorElementBody.innerHTML = "";
		},
		openModalDialog: function(e) {
			if (this.options.deliveryMethod && this.options.deliveryMethod === 'modal' ) {
				if (this.dialogOpen && !e.target.closest('#fba-button') && !e.target.closest('.fba-modal-dialog')) {
					this.closeDialog();
				}
			} else if (this.options.deliveryMethod && this.options.deliveryMethod === 'custom-button-modal' ) {
				if (this.dialogOpen && !e.target.closest('#' + this.options.elementSelector) && !e.target.closest('.fba-modal-dialog')) {
					this.closeDialog();
				}
			}
		},
		handleButtonClick: function(e) {
			e.preventDefault();
			this.activatedButton = e.target;
			this.loadDialog();
		},
		handleDialogClose: function(e) {
			e.preventDefault();
			this.closeDialog();
		},
		handleOtherOption: function(e) {
			var selectorId =  "#" + e.srcElement.getAttribute("data-option-id");
			var other_val = e.target.value.replace(/,/g, '');
			if (other_val == '') other_val = 'other';
			var option = this.formElement().querySelector(selectorId);
			option.value = other_val;
		},
		handlePhoneInput: function(e) {
		    var number = e.srcElement.value.replace(/[^\d]/g, '');
		    if (number.length == 7) {
		      number = number.replace(/(\d{3})(\d{4})/, "$1-$2");
		    } else if (number.length == 10) {
		      number = number.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");
		    }
		    e.srcElement.value = number;
		},
		handleEmailInput: function(e) {
			var EmailRegex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
			var email = e.srcElement.value.trim();
			if (email.length == 0) {
				return;
			}
			result = EmailRegex.test(email);
			if (!result) {
				showWarning($(this),"Please enter a valid email address");
			} else {
				showValid($(this));
	    	}
		    e.srcElement.value = number;
		},
		handleSubmitClick: function(e) {
			e.preventDefault();
			this.resetErrors();
			var formElement = this.formElement();
			var self = this;
			if (self.validateForm(formElement)) {
				// disable submit button and show sending feedback message
				var submitButton = formElement.querySelector("[type='submit']");
				submitButton.disabled = true;
				submitButton.classList.add("aria-disabled");
				self.sendFeedback();
			}
		},
		handleYesNoSubmitClick: function(e) {
			e.preventDefault();

			var input = this.formComponent().querySelector('.fba-touchpoints-page-form');
			input.value = e.target.value;
			this.resetErrors();
			var self = this;
			var formElement = this.formElement();
			if (self.validateForm(formElement)) {
				var submitButtons = formElement.querySelectorAll("[type='submit']");
				Array.prototype.forEach.call(submitButtons, function(submitButton) {
					submitButton.disabled = true;
				})
				self.sendFeedback();
			}
		},
		validateForm: function(form) {
			this.hideValidationError(form);
			var valid = this.checkRequired(form) && this.checkEmail(form) && this.checkPhone(form) && this.checkDate(form);
			return valid;
		},
		checkRequired: function(form) {
			var requiredItems = form.querySelectorAll('[required]');
			var questions = {};
			// Build a dictionary of questions which require an answer
			Array.prototype.forEach.call(requiredItems, function(item) { questions[item.name] = item });

			Array.prototype.forEach.call(requiredItems, function(item) {
				switch (item.type) {
				case 'radio':
					if (item.checked) delete(questions[item.name]);
					break;
				case 'checkbox':
				  if (item.checked) delete(questions[item.name]);
					break;
				case 'select-one':
					if (item.selectedIndex > 0) delete(questions[item.name]);
					break;
				default:
					if (item.value.length > 0) delete(questions[item.name]);
				}
			});
			for (var key in questions) {
				this.showValidationError(questions[key], 'A response is required: ');
				return false;
			}
			return true;
		},
		checkDate: function(form) {
			var dateItems = form.querySelectorAll('.date-select');
			var questions = {};
			// Build a dictionary of questions which require an answer
			Array.prototype.forEach.call(dateItems, function(item) { questions[item.name] = item });
			Array.prototype.forEach.call(dateItems, function(item) {
			  if (item.value.length == 0) {
			  	delete(questions[item.name]);
			  } else {
				var isValidDate = Date.parse(item.value);
			    if (!isNaN(isValidDate)) delete(questions[item.name]);
			  }
			});
			for (var key in questions) {
				this.showValidationError(questions[key], 'Please enter a valid value: ');
				return false;
			}
			return true;
		},
		checkEmail: function(form) {
			var emailItems = form.querySelectorAll('input[type="email"]');
			var questions = {};
			// Build a dictionary of questions which require an answer
			Array.prototype.forEach.call(emailItems, function(item) { questions[item.name] = item });
			Array.prototype.forEach.call(emailItems, function(item) {
			  if (item.value.length == 0) {
			  	delete(questions[item.name]);
			  } else {
			    var EmailRegex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
			    if (EmailRegex.test(item.value)) delete(questions[item.name]);
			  }
			});
			for (var key in questions) {
				this.showValidationError(questions[key], 'Please enter a valid value: ');
				return false;
			}
			return true;
		},
		checkPhone: function(form) {
			var phoneItems = form.querySelectorAll('input[type="tel"]');
			var questions = {};
			// Build a dictionary of questions which require an answer
			Array.prototype.forEach.call(phoneItems, function(item) { questions[item.name] = item });
			Array.prototype.forEach.call(phoneItems, function(item) {
			  if (item.value.length == 0) {
			  	delete(questions[item.name]);
			  } else {
			    const PhoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/;
			    if (PhoneRegex.test(item.value)) delete(questions[item.name]);
			  }
			});
			for (var key in questions) {
				this.showValidationError(questions[key], 'Please enter a valid value: ');
				return false;
			}
			return true;
		},
		showValidationError: function(question, error) {
			var questionDiv = question.closest(".question");
			var label = questionDiv.querySelector(".usa-label") || questionDiv.querySelector(".usa-legend");
			var questionNum = label.innerText;

			// show page with validation error
			var errorPage = question.closest(".section");
			if (!errorPage.classList.contains("visible")) {
				var visiblePage = this.formComponent().getElementsByClassName("section visible")[0];
				visiblePage.classList.remove("visible");
				errorPage.classList.add("visible");
			}

			questionDiv.setAttribute('class', 'usa-form-group usa-form-group--error');
			var span = d.createElement('span');
			span.setAttribute('id', 'input-error-message');
			span.setAttribute('role','alert');
			span.setAttribute('class','usa-error-message');
			span.innerText = error + questionNum;
			label.parentNode.insertBefore(span, label.nextSibling);
			var input = d.createElement('input');
			input.setAttribute('hidden', 'true');
			input.setAttribute('id','input-error');
			input.setAttribute('type','text');
			input.setAttribute('name','input-error');
			input.setAttribute('aria-describedby','input-error-message');
			questionDiv.appendChild(input);
			questionDiv.scrollIntoView();
			questionDiv.focus();

			// enable submit button ( so user can fix error and resubmit )
			var submitButton = this.formComponent().querySelector("[type='submit']");
			submitButton.disabled = false;
			submitButton.classList.remove("aria-disabled");
		},
		hideValidationError: function(form) {
			var elem = form.querySelector('.usa-form-group--error');
			if (elem == null) return;
			elem.setAttribute('class','question');
			var elem = form.querySelector('#input-error-message');
			if (elem != null) elem.parentNode.removeChild(elem);
			elem = form.querySelector('#input-error');
			if (elem != null) elem.parentNode.removeChild(elem);
		},
		textCounter: function(event) {
			const field = event.target;
			const maxLimit = event.target.getAttribute("maxlength");

			var countfield = field.parentNode.querySelector(".counter-msg");
			if (field.value.length > maxLimit) {
				field.value = field.value.substring(0, maxLimit);
				countfield.innerText = '0 characters left';
				return false;
			} else {
				countfield.innerText = "" + (maxLimit - field.value.length) + " characters left";
			}
		},
		loadButton: function() {
			// Add the fixed, floating tab button
			this.buttonEl = d.createElement('a');
			this.buttonEl.setAttribute('id', 'fba-button');
			this.buttonEl.setAttribute('data-id', this.options.formId);
			this.buttonEl.setAttribute('class', 'fba-button fixed-tab-button usa-button');
			this.buttonEl.setAttribute('name', 'fba-button');
			this.buttonEl.setAttribute('href', 'javascript:void(0)');
			this.buttonEl.setAttribute('aria-haspopup', 'dialog');
			this.buttonEl.setAttribute('aria-controls', 'dialog');
			this.buttonEl.addEventListener('click', this.handleButtonClick.bind(this), false);
			this.buttonEl.innerHTML = this.options.modalButtonText;
			d.body.appendChild(this.buttonEl);

			this.loadFeebackSkipLink();
		},
		loadFeebackSkipLink: function() {
			this.skipLink = d.createElement('a');
			this.skipLink.setAttribute('class', 'usa-skipnav touchpoints-skipnav');
			this.skipLink.setAttribute('href', '#fba-button');
			this.skipLink.addEventListener('click', function() {
				d.querySelector("#fba-button").focus();
			});
			this.skipLink.innerHTML = 'Skip to feedback';

			var existingSkipLinks = d.querySelector('.usa-skipnav');
			if(existingSkipLinks) {
				existingSkipLinks.insertAdjacentElement('afterend', this.skipLink);
			} else {
				d.body.prepend(this.skipLink);
			}
		},
		// Used when in a modal
		loadDialog: function() {
			d.dispatchEvent(new Event('onTouchpointsModalOpen'));
			this.formComponent().removeAttribute("hidden");
			this.formComponent().setAttribute('aria-hidden', false);
			this.formComponent().focus()
			this.dialogOpen = true;
		},
		closeDialog: function() {
			d.dispatchEvent(new Event('onTouchpointsModalClose'));
			this.formComponent().setAttribute("hidden", true);
			this.formComponent().setAttribute('aria-hidden', true);
			this.activatedButton?.focus?.();
			this.dialogOpen = false;
		},
		sendFeedback: function() {
			d.dispatchEvent(new Event('onTouchpointsFormSubmission'));
			var form = this.formElement();
			this.ajaxPost(form, this.formSuccess);
		},
		successHeadingText: function() {
			return this.options.successTextHeading;
		},
		successText: function() {
			return this.options.successText;
		},
		showFormSuccess: function(e) {
			var formComponent = this.formComponent();
			var formElement = this.formElement();
			var alertElement = formComponent.querySelector(".fba-alert");
			var alertElementHeading = formComponent.querySelector(".usa-alert__heading");
			var alertElementBody = formComponent.querySelector(".usa-alert__text");

			// Display success Message
			alertElementHeading.innerHTML += this.successHeadingText();
			alertElementBody.innerHTML = this.successText();
			alertElement.removeAttribute("hidden");
			this.formComponent().scrollIntoView();

			// Hide Form Elements
			if (formElement) {
				// And clear the Form's Fields
				formElement.reset();
				if (formElement.querySelector('.touchpoints-form-body')) {
					var formBody = formElement.querySelector('.touchpoints-form-body');
					if(formBody) {
						formBody.setAttribute("hidden", true);
					}
				}
				if (formComponent.querySelector('.touchpoints-form-disclaimer')) {
					var formDisclaimer = formComponent.querySelector('.touchpoints-form-disclaimer');
					if(formDisclaimer) {
						formDisclaimer.setAttribute("hidden", true);
					}
				}

			}
		},
		resetFormDisplay: function() {
			if (this.successState === false) {
				return false;
			}

			// Hide and Reset Flash Message
			this.resetErrors();

			// Re-enable Submit Button
			var formElement = this.formElement();
			var submitButton = formElement.querySelector("[type='submit']");
			submitButton.disabled = false;

			// Show Form Elements
			if (formElement) {
				if (formElement.querySelector('.touchpoints-form-body')) {
					var formBody = formElement.querySelector('.touchpoints-form-body')
					if(formBody) {
						formBody.removeAttribute("hidden");
					}
				}
			}
		},
		formSuccess: function(e) {
			// Clear the alert box
			var formComponent = this.formComponent();
			var alertElement = formComponent.querySelector(".fba-alert");
			var alertElementBody = formComponent.getElementsByClassName("usa-alert__text")[0];
			var alertErrorElement = formComponent.querySelector(".fba-alert-error");
			var alertErrorElementBody = alertErrorElement.getElementsByClassName("usa-alert__text")[0];
			alertElementBody.innerHTML = "";
			alertErrorElementBody.innerHTML = "";

			var formElement = this.formElement();
			var submitButton = formElement.querySelector("[type='submit']");

			if (e.target.readyState === 4) {
	      		if (e.target.status === 201) { // SUCCESS!
					this.successState = true;
					d.dispatchEvent(new Event('onTouchpointsFormSubmissionSuccess'));
					this.isFormSubmitted = true;
					if(submitButton) {
						submitButton.disabled = true;
					}
					this.showFormSuccess();
				} else if (e.target.status === 422) { // FORM ERRORS
					this.successState = false;
					d.dispatchEvent(new Event('onTouchpointsFormSubmissionError'));
					if(submitButton) {
						submitButton.disabled = false;
					}

					var jsonResponse = JSON.parse(e.target.response);
					var errors = jsonResponse.messages;

					for (var err in errors) {
						if (errors.hasOwnProperty(err)) {
							alertErrorElementBody.innerHTML += err;
							alertErrorElementBody.innerHTML += " ";
							alertErrorElementBody.innerHTML += errors[err];
							alertErrorElementBody.innerHTML += "<br />";
						}
					}

					alertErrorElement.removeAttribute("hidden");
				} else { // OTHER SERVER ERROR
					alertErrorElement.removeAttribute("hidden");
					alertErrorElementBody.innerHTML += "Server error. We're sorry, but this submission was not successful. The Product Team has been notified.";
				}
			}
		},
		ajaxPost: function (form, callback) {
	    var url = form.action;
	    var xhr = new XMLHttpRequest();
			// for each form question
			var params = this.options.questionParams(form);

			// Combine Referrer and Pathname with Form-specific params
			params["referer"] = d.referrer;
			params["hostname"] = N.location.hostname;
			params["page"] = N.location.pathname;
			params["location_code"] = form.querySelector("#fba_location_code") ? form.querySelector("#fba_location_code").value : null;
			params["fba_directive"] = form.querySelector("#fba_directive") ? form.querySelector("#fba_directive").value : null;
			params["language"] = "en";

			// Submit Feedback with a POST
			xhr.open("POST", url);
			xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8;");
			xhr.onload = callback.bind(this);
			xhr.send(JSON.stringify({
				"submission": params,
			}));
		},
		currentPageNumber: 1, // start at 1
		showInstructions: function() {
			const instructions = this.formComponent().getElementsByClassName("fba-instructions")[0];

			if(instructions) {
				if (this.currentPageNumber == 1) {
					instructions.removeAttribute("hidden");
				} else {
					instructions.setAttribute("hidden", true);
				}
			}

			const requiredQuestionsNotice = this.formComponent().getElementsByClassName("required-questions-notice")[0];
			if(requiredQuestionsNotice) {
				if (this.currentPageNumber == 1) {
					requiredQuestionsNotice.removeAttribute("hidden");
				} else {
					requiredQuestionsNotice.setAttribute("hidden", true);
				}
			}
		},
		_pagination: function() {
			var previousButtons = this.formComponent().getElementsByClassName("previous-section");
			var nextButtons =  this.formComponent().getElementsByClassName("next-section");

			var self = this;
			for (var i = 0; i < previousButtons.length; i++) {
				previousButtons[i].addEventListener('click', function(e) {
					e.preventDefault();
					var currentPage = e.target.closest(".section");
					if (!this.validateForm(currentPage)) return false;
					currentPage.classList.remove("visible");
					this.currentPageNumber--;
					this.showInstructions();
					currentPage.previousElementSibling.classList.add("visible");

					const previousPageEvent = new CustomEvent('onTouchpointsFormPreviousPage', {
						detail: {
							formComponent: this
						}
					});
					d.dispatchEvent(previousPageEvent);

					// if in a modal, scroll to the top of the modal on previous button click
					if(this.formComponent().getElementsByClassName("fba-modal")[0]) {
						this.formComponent().scrollTo(0,0);
					} else {
						N.scrollTo(0, 0);
					}
				}.bind(self));
			}
			for (var i = 0; i < nextButtons.length; i++) {
				nextButtons[i].addEventListener('click', function(e) {
					e.preventDefault();
					var currentPage = e.target.closest(".section");
					if (!this.validateForm(currentPage)) return false;
					currentPage.classList.remove("visible");
					this.currentPageNumber++;
					this.showInstructions();
					currentPage.nextElementSibling.classList.add("visible");

					const nextPageEvent = new CustomEvent('onTouchpointsFormNextPage', {
						detail: {
							formComponent: this
						}
					});
					d.dispatchEvent(nextPageEvent);

					// if in a modal, scroll to the top of the modal on next button click
					if(this.formComponent().getElementsByClassName("fba-modal")[0]) {
						this.formComponent().scrollTo(0,0);
					} else {
						N.scrollTo(0, 0);
					}
				}.bind(self))
			}
		}
	};
};

// Specify the options for your form
const touchpointFormOptions89426825 = {
	'formId': "89426825",
	'modalButtonText': "Help improve this site",
	'elementSelector': "",
	'css' : ".fba-modal {\n  background-color: rgb(0, 0, 0, 0.375);\n  z-index: 10001;\n  height: 100%;\n  position: fixed;\n  top: 0;\n  left: 0;\n  right: 0;\n  overflow-x: auto;\n  padding: 20px;\n}\n\n.fba-modal-dialog {\n  background: #fff;\n  border: 1px solid #E5E5E5;\n  margin: 0 auto 40px auto;\n  max-width: 35rem;\n  position: relative;\n}\n\n.fba-modal-dialog .wrapper {\n  padding-left: 20px;\n  padding-right: 20px;\n}\n\n.fixed-tab-button {\n  bottom: 0;\n  padding: 5px 10px;\n  position: fixed;\n  right: 12px;\n  z-index: 9999;\n\n}\n#fba-button.usa-button:hover,\n.fixed-tab-button.usa-button:hover {\n  color:white;\n  background-color:#1a4480;\n  border-bottom:0;\n  text-decoration:none;\n}\n\n#fba-modal-title {\n  margin-right: 20px;\n  margin-top: 0;\n  word-wrap: break-word;\n}\n\n#fba-text-name, #fba-text-email {\n  max-width: 100% !important;\n  font-size: 100%\n}\n\n.fba-modal-dialog .fba-modal-close {\n  position: absolute;\n  top: 0;\n  right: 0;\n  padding: 10px;\n  font-size: 24px;\n  color: #5b616b;\n  background: none;\n  line-height: 1;\n  text-decoration: none;\n  width: auto;\n  z-index: 10;\n}\n\n/* Form Sections */\n.touchpoints-form-wrapper form div.section {\n  display: none;\n}\n.touchpoints-form-wrapper form div.section.visible {\n  display: block;\n}\n\n.hide {\n  display: none;\n}\n\n/* This file was generated by the gulp task \'compileWidgetSass\'. */\n\n@charset \"UTF-8\";\n.fba-modal-dialog .usa-textarea, .fba-modal-dialog .usa-select, .fba-modal-dialog .usa-range, .fba-modal-dialog .usa-radio__label, .fba-modal-dialog .usa-input, .fba-modal-dialog .usa-hint, .fba-modal-dialog .usa-fieldset, .fba-modal-dialog .usa-combo-box__input, .fba-modal-dialog .usa-combo-box__list, .fba-modal-dialog .usa-checkbox__label{\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:1.06rem;\n  line-height:1.3;\n}\n\n.fba-modal-dialog .usa-textarea, .fba-modal-dialog .usa-select, .fba-modal-dialog .usa-range, .fba-modal-dialog .usa-input, .fba-modal-dialog .usa-combo-box__input{\n  border-width:1px;\n  border-color:#565c65;\n  border-style:solid;\n  -webkit-appearance:none;\n     -moz-appearance:none;\n          appearance:none;\n  border-radius:0;\n  color:#1b1b1b;\n  display:block;\n  height:2.5rem;\n  margin-top:0.5rem;\n  max-width:30rem;\n  padding:0.5rem;\n  width:100%;\n}\n\n.fba-modal-dialog .usa-accordion{\n  margin-bottom:0;\n  margin-top:0;\n  list-style-type:none;\n  padding-left:0;\n  color:#1b1b1b;\n  margin:0;\n  padding:0;\n  width:100%;\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:1.06rem;\n  line-height:1.5;\n}\n.fba-modal-dialog .usa-accordion > li{\n  margin-bottom:0;\n  max-width:unset;\n}\n.fba-modal-dialog .usa-accordion > ul li ul{\n  list-style:disc;\n}\n.fba-modal-dialog .usa-accordion > ul li ul > li > ul{\n  list-style:circle;\n}\n.fba-modal-dialog .usa-accordion > ul li ul > li > ul > li > ul{\n  list-style:square;\n}\n.fba-modal-dialog .usa-accordion + .usa-accordion,\n.fba-modal-dialog .usa-accordion + .usa-accordion--bordered{\n  margin-top:0.5rem;\n}\n\n.fba-modal-dialog .usa-accordion--bordered .usa-accordion__content{\n  border-bottom:0.25rem solid #f0f0f0;\n  border-left:0.25rem solid #f0f0f0;\n  border-right:0.25rem solid #f0f0f0;\n  padding-bottom:1rem;\n}\n.fba-modal-dialog .usa-accordion--bordered .usa-accordion__heading{\n  margin-bottom:0;\n}\n\n.fba-modal-dialog .usa-accordion__heading,\n.fba-modal-dialog .usa-prose .usa-accordion__heading{\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:1.06rem;\n  line-height:0.9;\n  margin:0;\n}\n.fba-modal-dialog .usa-accordion__heading:not(:first-child),\n.fba-modal-dialog .usa-prose .usa-accordion__heading:not(:first-child){\n  margin-top:0.5rem;\n}\n\n.fba-modal-dialog .usa-accordion__content{\n  color:#1b1b1b;\n  background-color:white;\n  margin-top:0;\n  overflow:auto;\n  padding:1rem 1.25rem calc(1rem - 0.25rem) 1.25rem;\n}\n.fba-modal-dialog .usa-accordion__content > *:first-child{\n  margin-top:0;\n}\n.fba-modal-dialog .usa-accordion__content > *:last-child{\n  margin-bottom:0;\n}\n\n.fba-modal-dialog .usa-accordion__button{\n  color:#005ea2;\n  text-decoration:underline;\n  background-color:transparent;\n  border:0;\n  border-radius:0;\n  box-shadow:none;\n  font-weight:normal;\n  justify-content:normal;\n  text-align:left;\n  margin:0;\n  padding:0;\n  color:#1b1b1b;\n  background-color:#f0f0f0;\n  background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/remove.svg\"), linear-gradient(transparent, transparent);\n  background-repeat:no-repeat;\n  background-position:right 1.25rem center;\n  background-size:1.5rem;\n  cursor:pointer;\n  display:inline-block;\n  font-weight:700;\n  margin:0;\n  padding:1rem 3.5rem 1rem 1.25rem;\n  text-decoration:none;\n  width:100%;\n}\n.fba-modal-dialog .usa-accordion__button:visited{\n  color:#54278f;\n}\n.fba-modal-dialog .usa-accordion__button:hover{\n  color:#1a4480;\n}\n.fba-modal-dialog .usa-accordion__button:active{\n  color:#162e51;\n}\n.fba-modal-dialog .usa-accordion__button:focus{\n  outline:0.25rem solid #2491ff;\n  outline-offset:0rem;\n}\n.fba-modal-dialog .usa-accordion__button:hover, .fba-modal-dialog .usa-accordion__button.usa-button--hover, .fba-modal-dialog .usa-accordion__button:disabled:hover, .fba-modal-dialog .usa-accordion__button[aria-disabled=true]:hover, .fba-modal-dialog .usa-accordion__button:disabled.usa-button--hover, .fba-modal-dialog .usa-accordion__button[aria-disabled=true].usa-button--hover, .fba-modal-dialog .usa-accordion__button:active, .fba-modal-dialog .usa-accordion__button.usa-button--active, .fba-modal-dialog .usa-accordion__button:disabled:active, .fba-modal-dialog .usa-accordion__button[aria-disabled=true]:active, .fba-modal-dialog .usa-accordion__button:disabled.usa-button--active, .fba-modal-dialog .usa-accordion__button[aria-disabled=true].usa-button--active, .fba-modal-dialog .usa-accordion__button:disabled:focus, .fba-modal-dialog .usa-accordion__button[aria-disabled=true]:focus, .fba-modal-dialog .usa-accordion__button:disabled.usa-focus, .fba-modal-dialog .usa-accordion__button[aria-disabled=true].usa-focus, .fba-modal-dialog .usa-accordion__button:disabled, .fba-modal-dialog .usa-accordion__button[aria-disabled=true], .fba-modal-dialog .usa-accordion__button.usa-button--disabled{\n  background-color:transparent;\n  box-shadow:none;\n  text-decoration:underline;\n}\n.fba-modal-dialog .usa-accordion__button.usa-button--hover{\n  color:#1a4480;\n}\n.fba-modal-dialog .usa-accordion__button.usa-button--active{\n  color:#162e51;\n}\n.fba-modal-dialog .usa-accordion__button:disabled, .fba-modal-dialog .usa-accordion__button[aria-disabled=true], .fba-modal-dialog .usa-accordion__button:disabled:hover, .fba-modal-dialog .usa-accordion__button[aria-disabled=true]:hover, .fba-modal-dialog .usa-accordion__button[aria-disabled=true]:focus{\n  color:#757575;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-accordion__button:disabled, .fba-modal-dialog .usa-accordion__button[aria-disabled=true], .fba-modal-dialog .usa-accordion__button:disabled:hover, .fba-modal-dialog .usa-accordion__button[aria-disabled=true]:hover, .fba-modal-dialog .usa-accordion__button[aria-disabled=true]:focus{\n    color:GrayText;\n  }\n}\n.fba-modal-dialog .usa-accordion__button:hover{\n  color:#1b1b1b;\n  background-color:#dfe1e2;\n  background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/remove.svg\"), linear-gradient(transparent, transparent);\n  background-repeat:no-repeat;\n  text-decoration:none;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-accordion__button{\n    border:2px solid transparent;\n    position:relative;\n  }\n  .fba-modal-dialog .usa-accordion__button::before{\n    background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/remove.svg\");\n    background-repeat:no-repeat;\n    background-position:center center;\n    background-size:1.5rem 1.5rem;\n    display:inline-block;\n    height:1.5rem;\n    width:1.5rem;\n    height:100%;\n    position:absolute;\n    right:1.25rem;\n    top:0;\n    content:\"\";\n  }\n  @supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n    .fba-modal-dialog .usa-accordion__button::before{\n      background:none;\n      background-color:ButtonText;\n      -webkit-mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/remove.svg\"), linear-gradient(transparent, transparent);\n              mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/remove.svg\"), linear-gradient(transparent, transparent);\n      -webkit-mask-position:center center;\n              mask-position:center center;\n      -webkit-mask-repeat:no-repeat;\n              mask-repeat:no-repeat;\n      -webkit-mask-size:1.5rem 1.5rem;\n              mask-size:1.5rem 1.5rem;\n    }\n  }\n}\n\n.fba-modal-dialog .usa-accordion__button[aria-expanded=false]{\n  background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/add.svg\"), linear-gradient(transparent, transparent);\n  background-repeat:no-repeat;\n  background-size:1.5rem;\n}\n.fba-modal-dialog .usa-accordion__button[aria-expanded=false]:hover{\n  background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/add.svg\"), linear-gradient(transparent, transparent);\n  background-repeat:no-repeat;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-accordion__button[aria-expanded=false]::before{\n    background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/add.svg\");\n    background-repeat:no-repeat;\n    background-position:center center;\n    background-size:1.5rem 1.5rem;\n    display:inline-block;\n    height:1.5rem;\n    width:1.5rem;\n    height:100%;\n    position:absolute;\n    right:1.25rem;\n    top:0;\n  }\n  @supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n    .fba-modal-dialog .usa-accordion__button[aria-expanded=false]::before{\n      background:none;\n      background-color:ButtonText;\n      -webkit-mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/add.svg\"), linear-gradient(transparent, transparent);\n              mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/add.svg\"), linear-gradient(transparent, transparent);\n      -webkit-mask-position:center center;\n              mask-position:center center;\n      -webkit-mask-repeat:no-repeat;\n              mask-repeat:no-repeat;\n      -webkit-mask-size:1.5rem 1.5rem;\n              mask-size:1.5rem 1.5rem;\n    }\n  }\n}\n\n.fba-modal-dialog .usa-alert{\n  background-color:#f0f0f0;\n  border-left:0.5rem solid #a9aeb1;\n  color:#1b1b1b;\n}\n.fba-modal-dialog .usa-alert .usa-alert__body{\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:1.06rem;\n  line-height:1.5;\n  margin-left:auto;\n  margin-right:auto;\n  max-width:64rem;\n  padding-bottom:1rem;\n  padding-top:1rem;\n  padding-left:1rem;\n  padding-right:1rem;\n  position:relative;\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-alert .usa-alert__body{\n    padding-left:1.8333333333rem;\n  }\n}\n.fba-modal-dialog .usa-alert .usa-alert__text{\n  margin-bottom:0;\n  margin-top:0;\n}\n.fba-modal-dialog .usa-alert .usa-alert__text:only-child{\n  padding-bottom:0;\n  padding-top:0;\n}\n.fba-modal-dialog .usa-alert .usa-alert__heading{\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:1.46rem;\n  line-height:0.9;\n  margin-top:0;\n  margin-bottom:0.5rem;\n}\n.fba-modal-dialog .usa-alert > .usa-list,\n.fba-modal-dialog .usa-alert .usa-alert__body > .usa-list{\n  padding-left:2ch;\n}\n.fba-modal-dialog .usa-alert > .usa-list:last-child,\n.fba-modal-dialog .usa-alert .usa-alert__body > .usa-list:last-child{\n  margin-bottom:0;\n}\n.fba-modal-dialog * + .usa-alert{\n  margin-top:1rem;\n}\n\n.fba-modal-dialog .usa-alert--success{\n  background-color:#ecf3ec;\n  border-left-color:#00a91c;\n}\n.fba-modal-dialog .usa-alert--success .usa-alert__body{\n  color:#1b1b1b;\n  background-color:#ecf3ec;\n  padding-left:2.9166666667rem;\n}\n.fba-modal-dialog .usa-alert--success .usa-alert__body::before{\n  background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/check_circle.svg\");\n  background-repeat:no-repeat;\n  background-position:center center;\n  background-size:2rem 2rem;\n  display:inline-block;\n  height:2rem;\n  width:2rem;\n  content:\"\";\n  display:block;\n  left:0.5rem;\n  position:absolute;\n  top:0.75rem;\n}\n@supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n  .fba-modal-dialog .usa-alert--success .usa-alert__body::before{\n    background:none;\n    background-color:#1b1b1b;\n    -webkit-mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/check_circle.svg\"), linear-gradient(transparent, transparent);\n            mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/check_circle.svg\"), linear-gradient(transparent, transparent);\n    -webkit-mask-position:center center;\n            mask-position:center center;\n    -webkit-mask-repeat:no-repeat;\n            mask-repeat:no-repeat;\n    -webkit-mask-size:2rem 2rem;\n            mask-size:2rem 2rem;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-alert--success .usa-alert__body::before{\n    left:1.5rem;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-alert--success .usa-alert__body{\n    padding-left:4rem;\n    padding-right:4rem;\n  }\n}\n.fba-modal-dialog .usa-alert--success .usa-alert__body .usa-link{\n  color:#005ea2;\n}\n.fba-modal-dialog .usa-alert--success .usa-alert__body .usa-link:visited{\n  color:#54278f;\n}\n.fba-modal-dialog .usa-alert--success .usa-alert__body .usa-link:hover, .fba-modal-dialog .usa-alert--success .usa-alert__body .usa-link:active{\n  color:#1a4480;\n}\n\n.fba-modal-dialog .usa-alert--warning{\n  background-color:#faf3d1;\n  border-left-color:#ffbe2e;\n}\n.fba-modal-dialog .usa-alert--warning .usa-alert__body{\n  color:#1b1b1b;\n  background-color:#faf3d1;\n  padding-left:2.9166666667rem;\n}\n.fba-modal-dialog .usa-alert--warning .usa-alert__body::before{\n  background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/warning.svg\");\n  background-repeat:no-repeat;\n  background-position:center center;\n  background-size:2rem 2rem;\n  display:inline-block;\n  height:2rem;\n  width:2rem;\n  content:\"\";\n  display:block;\n  left:0.5rem;\n  position:absolute;\n  top:0.75rem;\n}\n@supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n  .fba-modal-dialog .usa-alert--warning .usa-alert__body::before{\n    background:none;\n    background-color:#1b1b1b;\n    -webkit-mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/warning.svg\"), linear-gradient(transparent, transparent);\n            mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/warning.svg\"), linear-gradient(transparent, transparent);\n    -webkit-mask-position:center center;\n            mask-position:center center;\n    -webkit-mask-repeat:no-repeat;\n            mask-repeat:no-repeat;\n    -webkit-mask-size:2rem 2rem;\n            mask-size:2rem 2rem;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-alert--warning .usa-alert__body::before{\n    left:1.5rem;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-alert--warning .usa-alert__body{\n    padding-left:4rem;\n    padding-right:4rem;\n  }\n}\n.fba-modal-dialog .usa-alert--warning .usa-alert__body .usa-link{\n  color:#005ea2;\n}\n.fba-modal-dialog .usa-alert--warning .usa-alert__body .usa-link:visited{\n  color:#54278f;\n}\n.fba-modal-dialog .usa-alert--warning .usa-alert__body .usa-link:hover, .fba-modal-dialog .usa-alert--warning .usa-alert__body .usa-link:active{\n  color:#1a4480;\n}\n\n.fba-modal-dialog .usa-alert--error{\n  background-color:#f4e3db;\n  border-left-color:#d54309;\n}\n.fba-modal-dialog .usa-alert--error .usa-alert__body{\n  color:#1b1b1b;\n  background-color:#f4e3db;\n  padding-left:2.9166666667rem;\n}\n.fba-modal-dialog .usa-alert--error .usa-alert__body::before{\n  background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/error.svg\");\n  background-repeat:no-repeat;\n  background-position:center center;\n  background-size:2rem 2rem;\n  display:inline-block;\n  height:2rem;\n  width:2rem;\n  content:\"\";\n  display:block;\n  left:0.5rem;\n  position:absolute;\n  top:0.75rem;\n}\n@supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n  .fba-modal-dialog .usa-alert--error .usa-alert__body::before{\n    background:none;\n    background-color:#1b1b1b;\n    -webkit-mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/error.svg\"), linear-gradient(transparent, transparent);\n            mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/error.svg\"), linear-gradient(transparent, transparent);\n    -webkit-mask-position:center center;\n            mask-position:center center;\n    -webkit-mask-repeat:no-repeat;\n            mask-repeat:no-repeat;\n    -webkit-mask-size:2rem 2rem;\n            mask-size:2rem 2rem;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-alert--error .usa-alert__body::before{\n    left:1.5rem;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-alert--error .usa-alert__body{\n    padding-left:4rem;\n    padding-right:4rem;\n  }\n}\n.fba-modal-dialog .usa-alert--error .usa-alert__body .usa-link{\n  color:#005ea2;\n}\n.fba-modal-dialog .usa-alert--error .usa-alert__body .usa-link:visited{\n  color:#54278f;\n}\n.fba-modal-dialog .usa-alert--error .usa-alert__body .usa-link:hover, .fba-modal-dialog .usa-alert--error .usa-alert__body .usa-link:active{\n  color:#1a4480;\n}\n\n.fba-modal-dialog .usa-alert--info{\n  background-color:#e7f6f8;\n  border-left-color:#00bde3;\n}\n.fba-modal-dialog .usa-alert--info .usa-alert__body{\n  color:#1b1b1b;\n  background-color:#e7f6f8;\n  padding-left:2.9166666667rem;\n}\n.fba-modal-dialog .usa-alert--info .usa-alert__body::before{\n  background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/info.svg\");\n  background-repeat:no-repeat;\n  background-position:center center;\n  background-size:2rem 2rem;\n  display:inline-block;\n  height:2rem;\n  width:2rem;\n  content:\"\";\n  display:block;\n  left:0.5rem;\n  position:absolute;\n  top:0.75rem;\n}\n@supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n  .fba-modal-dialog .usa-alert--info .usa-alert__body::before{\n    background:none;\n    background-color:#1b1b1b;\n    -webkit-mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/info.svg\"), linear-gradient(transparent, transparent);\n            mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/info.svg\"), linear-gradient(transparent, transparent);\n    -webkit-mask-position:center center;\n            mask-position:center center;\n    -webkit-mask-repeat:no-repeat;\n            mask-repeat:no-repeat;\n    -webkit-mask-size:2rem 2rem;\n            mask-size:2rem 2rem;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-alert--info .usa-alert__body::before{\n    left:1.5rem;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-alert--info .usa-alert__body{\n    padding-left:4rem;\n    padding-right:4rem;\n  }\n}\n.fba-modal-dialog .usa-alert--info .usa-alert__body .usa-link{\n  color:#005ea2;\n}\n.fba-modal-dialog .usa-alert--info .usa-alert__body .usa-link:visited{\n  color:#54278f;\n}\n.fba-modal-dialog .usa-alert--info .usa-alert__body .usa-link:hover, .fba-modal-dialog .usa-alert--info .usa-alert__body .usa-link:active{\n  color:#1a4480;\n}\n\n.fba-modal-dialog .usa-alert--emergency{\n  background-color:#9c3d10;\n  border-left-color:#9c3d10;\n}\n.fba-modal-dialog .usa-alert--emergency .usa-alert__body{\n  color:white;\n  background-color:#9c3d10;\n  padding-left:2.9166666667rem;\n}\n.fba-modal-dialog .usa-alert--emergency .usa-alert__body::before{\n  background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons-bg/error--white.svg\");\n  background-repeat:no-repeat;\n  background-position:center center;\n  background-size:2rem 2rem;\n  display:inline-block;\n  height:2rem;\n  width:2rem;\n  content:\"\";\n  display:block;\n  left:0.5rem;\n  position:absolute;\n  top:0.75rem;\n}\n@supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n  .fba-modal-dialog .usa-alert--emergency .usa-alert__body::before{\n    background:none;\n    background-color:white;\n    -webkit-mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/error.svg\"), linear-gradient(transparent, transparent);\n            mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/error.svg\"), linear-gradient(transparent, transparent);\n    -webkit-mask-position:center center;\n            mask-position:center center;\n    -webkit-mask-repeat:no-repeat;\n            mask-repeat:no-repeat;\n    -webkit-mask-size:2rem 2rem;\n            mask-size:2rem 2rem;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-alert--emergency .usa-alert__body::before{\n    left:1.5rem;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-alert--emergency .usa-alert__body{\n    padding-left:4rem;\n    padding-right:4rem;\n  }\n}\n.fba-modal-dialog .usa-alert--emergency .usa-alert__body .usa-link{\n  color:#dfe1e2;\n}\n.fba-modal-dialog .usa-alert--emergency .usa-alert__body .usa-link:visited{\n  color:#dfe1e2;\n}\n.fba-modal-dialog .usa-alert--emergency .usa-alert__body .usa-link:hover, .fba-modal-dialog .usa-alert--emergency .usa-alert__body .usa-link:active{\n  color:#f0f0f0;\n}\n\n.fba-modal-dialog .usa-alert--slim .usa-alert__body{\n  padding-bottom:0.5rem;\n  padding-top:0.5rem;\n  padding-left:2.4166666667rem;\n}\n.fba-modal-dialog .usa-alert--slim .usa-alert__body:before{\n  background-size:1.5rem;\n  height:1.5rem;\n  top:0.5rem;\n  width:1.5rem;\n}\n@supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n  .fba-modal-dialog .usa-alert--slim .usa-alert__body:before{\n    -webkit-mask-size:1.5rem;\n            mask-size:1.5rem;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-alert--slim .usa-alert__body{\n    padding-left:3.5rem;\n  }\n}\n\n.fba-modal-dialog .usa-alert--no-icon .usa-alert__body{\n  padding-left:0.5rem;\n}\n.fba-modal-dialog .usa-alert--no-icon .usa-alert__body:before{\n  display:none;\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-alert--no-icon .usa-alert__body{\n    padding-left:1.8333333333rem;\n  }\n}\n\n.fba-modal-dialog .usa-alert--validation .usa-checklist{\n  margin-top:1rem;\n}\n\n.fba-modal-dialog .usa-banner{\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:1.06rem;\n  line-height:1.5;\n  background-color:#f0f0f0;\n}\n@media all and (min-width: 40em){\n  .fba-modal-dialog .usa-banner{\n    font-size:0.87rem;\n    padding-bottom:0rem;\n  }\n}\n.fba-modal-dialog .usa-banner .usa-accordion{\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:1.06rem;\n  line-height:1.5;\n}\n.fba-modal-dialog .usa-banner .grid-row{\n  display:flex;\n  flex-wrap:wrap;\n}\n.fba-modal-dialog .usa-banner .grid-row.grid-gap-lg{\n  margin-left:-0.75rem;\n  margin-right:-0.75rem;\n}\n.fba-modal-dialog .usa-banner .grid-row.grid-gap-lg > *{\n  padding-left:0.75rem;\n  padding-right:0.75rem;\n}\n@media all and (min-width: 40em){\n  .fba-modal-dialog .usa-banner .grid-row .tablet\\:grid-col-6{\n    flex:0 1 auto;\n    width:50%;\n  }\n}\n\n.fba-modal-dialog .usa-banner__header,\n.fba-modal-dialog .usa-banner__content{\n  color:#1b1b1b;\n}\n\n.fba-modal-dialog .usa-banner__content{\n  margin-left:auto;\n  margin-right:auto;\n  max-width:64rem;\n  padding-left:1rem;\n  padding-right:1rem;\n  padding-left:1rem;\n  padding-right:1rem;\n  background-color:transparent;\n  font-size:1rem;\n  overflow:hidden;\n  padding-bottom:1rem;\n  padding-left:0.5rem;\n  padding-top:0.25rem;\n  width:100%;\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-banner__content{\n    padding-left:2rem;\n    padding-right:2rem;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-banner__content{\n    padding-left:2rem;\n    padding-right:2rem;\n  }\n}\n@media all and (min-width: 40em){\n  .fba-modal-dialog .usa-banner__content{\n    padding-bottom:1.5rem;\n    padding-top:1.5rem;\n  }\n}\n.fba-modal-dialog .usa-banner__content p:first-child{\n  margin:0;\n}\n\n.fba-modal-dialog .usa-banner__guidance{\n  display:flex;\n  align-items:flex-start;\n  max-width:64ex;\n  padding-top:1rem;\n}\n@media all and (min-width: 40em){\n  .fba-modal-dialog .usa-banner__guidance{\n    padding-top:0rem;\n  }\n}\n\n.fba-modal-dialog .usa-banner__lock-image{\n  height:1.5ex;\n  width:1.21875ex;\n}\n.fba-modal-dialog .usa-banner__lock-image path{\n  fill:currentColor;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-banner__lock-image path{\n    fill:CanvasText;\n  }\n}\n\n.fba-modal-dialog .usa-banner__inner{\n  padding-left:1rem;\n  padding-right:1rem;\n  margin-left:auto;\n  margin-right:auto;\n  max-width:64rem;\n  padding-left:1rem;\n  padding-right:1rem;\n  display:flex;\n  flex-wrap:wrap;\n  align-items:flex-start;\n  padding-right:0rem;\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-banner__inner{\n    padding-left:2rem;\n    padding-right:2rem;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-banner__inner{\n    padding-left:2rem;\n    padding-right:2rem;\n  }\n}\n@media all and (min-width: 40em){\n  .fba-modal-dialog .usa-banner__inner{\n    align-items:center;\n  }\n}\n\n.fba-modal-dialog .usa-banner__header{\n  padding-bottom:0.5rem;\n  padding-top:0.5rem;\n  font-size:0.8rem;\n  font-weight:normal;\n  min-height:3rem;\n  position:relative;\n}\n@media all and (min-width: 40em){\n  .fba-modal-dialog .usa-banner__header{\n    padding-bottom:0.25rem;\n    padding-top:0.25rem;\n    min-height:0;\n  }\n}\n\n.fba-modal-dialog .usa-banner__header-text{\n  margin-bottom:0;\n  margin-top:0;\n  font-size:0.8rem;\n  line-height:1.1;\n}\n\n.fba-modal-dialog .usa-banner__header-action{\n  color:#005ea2;\n  line-height:1.1;\n  margin-bottom:0rem;\n  margin-top:2px;\n  text-decoration:underline;\n}\n.fba-modal-dialog .usa-banner__header-action::after{\n  background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/expand_more.svg\");\n  background-repeat:no-repeat;\n  background-position:center center;\n  background-size:1rem 1rem;\n  display:inline-block;\n  height:1rem;\n  width:1rem;\n  content:\"\";\n  vertical-align:middle;\n  margin-left:auto;\n}\n@supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n  .fba-modal-dialog .usa-banner__header-action::after{\n    background:none;\n    background-color:#005ea2;\n    -webkit-mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/expand_more.svg\"), linear-gradient(transparent, transparent);\n            mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/expand_more.svg\"), linear-gradient(transparent, transparent);\n    -webkit-mask-position:center center;\n            mask-position:center center;\n    -webkit-mask-repeat:no-repeat;\n            mask-repeat:no-repeat;\n    -webkit-mask-size:1rem 1rem;\n            mask-size:1rem 1rem;\n  }\n  .fba-modal-dialog .usa-banner__header-action::after:hover{\n    background-color:#1a4480;\n  }\n}\n.fba-modal-dialog .usa-banner__header-action:hover::after{\n  content:\"\";\n  background-color:#1a4480;\n}\n.fba-modal-dialog .usa-banner__header-action:visited{\n  color:#54278f;\n}\n.fba-modal-dialog .usa-banner__header-action:hover, .fba-modal-dialog .usa-banner__header-action:active{\n  color:#1a4480;\n}\n.fba-modal-dialog .usa-banner__header--expanded .usa-banner__header-action{\n  display:none;\n}\n@media all and (min-width: 40em){\n  .fba-modal-dialog .usa-banner__header-action{\n    display:none;\n  }\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-banner__header-action{\n    color:LinkText;\n  }\n  .fba-modal-dialog .usa-banner__header-action::after{\n    background-color:ButtonText;\n  }\n}\n\n.fba-modal-dialog .usa-banner__header-flag{\n  float:left;\n  margin-right:0.5rem;\n  width:1rem;\n}\n@media all and (min-width: 40em){\n  .fba-modal-dialog .usa-banner__header-flag{\n    margin-right:0.5rem;\n    padding-top:0rem;\n  }\n}\n\n.fba-modal-dialog .usa-banner__header--expanded{\n  padding-right:3.5rem;\n}\n@media all and (min-width: 40em){\n  .fba-modal-dialog .usa-banner__header--expanded{\n    background-color:transparent;\n    display:block;\n    font-size:0.8rem;\n    font-weight:normal;\n    min-height:0rem;\n    padding-right:0rem;\n  }\n}\n.fba-modal-dialog .usa-banner__header--expanded .usa-banner__inner{\n  margin-left:0rem;\n}\n@media all and (min-width: 40em){\n  .fba-modal-dialog .usa-banner__header--expanded .usa-banner__inner{\n    margin-left:auto;\n  }\n}\n.fba-modal-dialog .usa-banner__header--expanded .usa-banner__header-action{\n  display:none;\n}\n\n.fba-modal-dialog .usa-banner__button{\n  color:#005ea2;\n  text-decoration:underline;\n  background-color:transparent;\n  border:0;\n  border-radius:0;\n  box-shadow:none;\n  font-weight:normal;\n  justify-content:normal;\n  text-align:left;\n  margin:0;\n  padding:0;\n  position:absolute;\n  left:0;\n  position:absolute;\n  bottom:0;\n  top:0;\n  color:#005ea2;\n  text-decoration:underline;\n  color:#005ea2;\n  display:block;\n  font-size:0.8rem;\n  height:auto;\n  line-height:1.1;\n  padding-top:0rem;\n  padding-left:0rem;\n  text-decoration:none;\n  width:auto;\n}\n.fba-modal-dialog .usa-banner__button:visited{\n  color:#54278f;\n}\n.fba-modal-dialog .usa-banner__button:hover{\n  color:#1a4480;\n}\n.fba-modal-dialog .usa-banner__button:active{\n  color:#162e51;\n}\n.fba-modal-dialog .usa-banner__button:focus{\n  outline:0.25rem solid #2491ff;\n  outline-offset:0rem;\n}\n.fba-modal-dialog .usa-banner__button:hover, .fba-modal-dialog .usa-banner__button.usa-button--hover, .fba-modal-dialog .usa-banner__button:disabled:hover, .fba-modal-dialog .usa-banner__button[aria-disabled=true]:hover, .fba-modal-dialog .usa-banner__button:disabled.usa-button--hover, .fba-modal-dialog .usa-banner__button[aria-disabled=true].usa-button--hover, .fba-modal-dialog .usa-banner__button:active, .fba-modal-dialog .usa-banner__button.usa-button--active, .fba-modal-dialog .usa-banner__button:disabled:active, .fba-modal-dialog .usa-banner__button[aria-disabled=true]:active, .fba-modal-dialog .usa-banner__button:disabled.usa-button--active, .fba-modal-dialog .usa-banner__button[aria-disabled=true].usa-button--active, .fba-modal-dialog .usa-banner__button:disabled:focus, .fba-modal-dialog .usa-banner__button[aria-disabled=true]:focus, .fba-modal-dialog .usa-banner__button:disabled.usa-focus, .fba-modal-dialog .usa-banner__button[aria-disabled=true].usa-focus, .fba-modal-dialog .usa-banner__button:disabled, .fba-modal-dialog .usa-banner__button[aria-disabled=true], .fba-modal-dialog .usa-banner__button.usa-button--disabled{\n  background-color:transparent;\n  box-shadow:none;\n  text-decoration:underline;\n}\n.fba-modal-dialog .usa-banner__button.usa-button--hover{\n  color:#1a4480;\n}\n.fba-modal-dialog .usa-banner__button.usa-button--active{\n  color:#162e51;\n}\n.fba-modal-dialog .usa-banner__button:disabled, .fba-modal-dialog .usa-banner__button[aria-disabled=true], .fba-modal-dialog .usa-banner__button:disabled:hover, .fba-modal-dialog .usa-banner__button[aria-disabled=true]:hover, .fba-modal-dialog .usa-banner__button[aria-disabled=true]:focus{\n  color:#757575;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-banner__button:disabled, .fba-modal-dialog .usa-banner__button[aria-disabled=true], .fba-modal-dialog .usa-banner__button:disabled:hover, .fba-modal-dialog .usa-banner__button[aria-disabled=true]:hover, .fba-modal-dialog .usa-banner__button[aria-disabled=true]:focus{\n    color:GrayText;\n  }\n}\n.fba-modal-dialog .usa-banner__button:visited{\n  color:#54278f;\n}\n.fba-modal-dialog .usa-banner__button:hover, .fba-modal-dialog .usa-banner__button:active{\n  color:#1a4480;\n}\n@media all and (max-width: 39.99em){\n  .fba-modal-dialog .usa-banner__button{\n    width:100%;\n  }\n  .fba-modal-dialog .usa-banner__button:enabled:focus{\n    outline-offset:-0.25rem;\n  }\n}\n@media all and (min-width: 40em){\n  .fba-modal-dialog .usa-banner__button{\n    color:#005ea2;\n    position:static;\n    bottom:auto;\n    left:auto;\n    right:auto;\n    top:auto;\n    display:inline;\n    margin-left:0.5rem;\n    position:relative;\n  }\n  .fba-modal-dialog .usa-banner__button::after{\n    background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/expand_more.svg\");\n    background-repeat:no-repeat;\n    background-position:center center;\n    background-size:1rem 1rem;\n    display:inline-block;\n    height:1rem;\n    width:1rem;\n    content:\"\";\n    vertical-align:middle;\n    margin-left:2px;\n  }\n  @supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n    .fba-modal-dialog .usa-banner__button::after{\n      background:none;\n      background-color:#005ea2;\n      -webkit-mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/expand_more.svg\"), linear-gradient(transparent, transparent);\n              mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/expand_more.svg\"), linear-gradient(transparent, transparent);\n      -webkit-mask-position:center center;\n              mask-position:center center;\n      -webkit-mask-repeat:no-repeat;\n              mask-repeat:no-repeat;\n      -webkit-mask-size:1rem 1rem;\n              mask-size:1rem 1rem;\n    }\n    .fba-modal-dialog .usa-banner__button::after:hover{\n      background-color:#1a4480;\n    }\n  }\n  .fba-modal-dialog .usa-banner__button:hover::after{\n    content:\"\";\n    background-color:#1a4480;\n  }\n  .fba-modal-dialog .usa-banner__button:visited{\n    color:#54278f;\n  }\n  .fba-modal-dialog .usa-banner__button:hover, .fba-modal-dialog .usa-banner__button:active{\n    color:#1a4480;\n  }\n  .fba-modal-dialog .usa-banner__button::after, .fba-modal-dialog .usa-banner__button:hover::after{\n    position:absolute;\n  }\n}\n@media (min-width: 40em) and (forced-colors: active){\n  .fba-modal-dialog .usa-banner__button::after, .fba-modal-dialog .usa-banner__button:hover::after{\n    background-color:ButtonText;\n  }\n}\n@media all and (min-width: 40em){\n  .fba-modal-dialog .usa-banner__button:hover{\n    text-decoration:none;\n  }\n}\n.fba-modal-dialog .usa-banner__button[aria-expanded=false], .fba-modal-dialog .usa-banner__button[aria-expanded=false]:hover, .fba-modal-dialog .usa-banner__button[aria-expanded=true], .fba-modal-dialog .usa-banner__button[aria-expanded=true]:hover{\n  background-image:none;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-banner__button[aria-expanded=false]::before, .fba-modal-dialog .usa-banner__button[aria-expanded=false]:hover::before, .fba-modal-dialog .usa-banner__button[aria-expanded=true]::before, .fba-modal-dialog .usa-banner__button[aria-expanded=true]:hover::before{\n    content:none;\n  }\n}\n@media all and (max-width: 39.99em){\n  .fba-modal-dialog .usa-banner__button[aria-expanded=true]::after{\n    background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/close.svg\");\n    background-repeat:no-repeat;\n    background-position:center center;\n    background-size:1.5rem 1.5rem;\n    display:inline-block;\n    height:3rem;\n    width:3rem;\n    content:\"\";\n    vertical-align:middle;\n    margin-left:0rem;\n  }\n  @supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n    .fba-modal-dialog .usa-banner__button[aria-expanded=true]::after{\n      background:none;\n      background-color:#005ea2;\n      -webkit-mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/close.svg\"), linear-gradient(transparent, transparent);\n              mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/close.svg\"), linear-gradient(transparent, transparent);\n      -webkit-mask-position:center center;\n              mask-position:center center;\n      -webkit-mask-repeat:no-repeat;\n              mask-repeat:no-repeat;\n      -webkit-mask-size:1.5rem 1.5rem;\n              mask-size:1.5rem 1.5rem;\n    }\n  }\n  .fba-modal-dialog .usa-banner__button[aria-expanded=true]::before{\n    position:absolute;\n    bottom:0;\n    top:0;\n    position:absolute;\n    right:0;\n    background-color:#dfe1e2;\n    content:\"\";\n    display:block;\n    height:3rem;\n    width:3rem;\n  }\n  .fba-modal-dialog .usa-banner__button[aria-expanded=true]::after{\n    position:absolute;\n    bottom:0;\n    top:0;\n    position:absolute;\n    right:0;\n  }\n}\n@media all and (min-width: 40em){\n  .fba-modal-dialog .usa-banner__button[aria-expanded=true]{\n    height:auto;\n    padding:0rem;\n    position:relative;\n  }\n  .fba-modal-dialog .usa-banner__button[aria-expanded=true]::after{\n    background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/expand_less.svg\");\n    background-repeat:no-repeat;\n    background-position:center center;\n    background-size:1rem 1rem;\n    display:inline-block;\n    height:1rem;\n    width:1rem;\n    content:\"\";\n    vertical-align:middle;\n    margin-left:2px;\n  }\n  @supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n    .fba-modal-dialog .usa-banner__button[aria-expanded=true]::after{\n      background:none;\n      background-color:#005ea2;\n      -webkit-mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/expand_less.svg\"), linear-gradient(transparent, transparent);\n              mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/expand_less.svg\"), linear-gradient(transparent, transparent);\n      -webkit-mask-position:center center;\n              mask-position:center center;\n      -webkit-mask-repeat:no-repeat;\n              mask-repeat:no-repeat;\n      -webkit-mask-size:1rem 1rem;\n              mask-size:1rem 1rem;\n    }\n    .fba-modal-dialog .usa-banner__button[aria-expanded=true]::after:hover{\n      background-color:#1a4480;\n    }\n  }\n  .fba-modal-dialog .usa-banner__button[aria-expanded=true]:hover::after{\n    content:\"\";\n    background-color:#1a4480;\n  }\n  .fba-modal-dialog .usa-banner__button[aria-expanded=true]::after, .fba-modal-dialog .usa-banner__button[aria-expanded=true]:hover::after{\n    position:absolute;\n  }\n}\n@media (min-width: 40em) and (forced-colors: active){\n  .fba-modal-dialog .usa-banner__button[aria-expanded=true]::after, .fba-modal-dialog .usa-banner__button[aria-expanded=true]:hover::after{\n    background-color:ButtonText;\n  }\n}\n\n.fba-modal-dialog .usa-banner__button-text{\n  position:absolute;\n  left:-999em;\n  right:auto;\n  text-decoration:underline;\n}\n@media all and (min-width: 40em){\n  .fba-modal-dialog .usa-banner__button-text{\n    position:static;\n    display:inline;\n  }\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-banner__button-text{\n    color:LinkText;\n  }\n}\n\n.fba-modal-dialog .usa-banner__icon{\n  width:2.5rem;\n}\n\n.fba-modal-dialog .usa-js-loading .usa-banner__content{\n  position:absolute;\n  left:-999em;\n  right:auto;\n}\n\n.fba-modal-dialog .usa-button{\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:1.06rem;\n  line-height:0.9;\n  color:white;\n  background-color:#005ea2;\n  -webkit-appearance:none;\n     -moz-appearance:none;\n          appearance:none;\n  align-items:center;\n  border:0;\n  border-radius:0.25rem;\n  cursor:pointer;\n  -moz-column-gap:0.5rem;\n       column-gap:0.5rem;\n  display:inline-flex;\n  font-weight:700;\n  justify-content:center;\n  margin-right:0.5rem;\n  padding:0.75rem 1.25rem;\n  text-align:center;\n  text-decoration:none;\n  width:100%;\n}\n@media all and (min-width: 30em){\n  .fba-modal-dialog .usa-button{\n    width:auto;\n  }\n}\n.fba-modal-dialog .usa-button:visited{\n  color:white;\n}\n.fba-modal-dialog .usa-button:hover, .fba-modal-dialog .usa-button.usa-button--hover{\n  color:white;\n  background-color:#1a4480;\n  border-bottom:0;\n  text-decoration:none;\n}\n.fba-modal-dialog .usa-button:active, .fba-modal-dialog .usa-button.usa-button--active{\n  color:white;\n  background-color:#162e51;\n}\n.fba-modal-dialog .usa-button:not([disabled]):focus, .fba-modal-dialog .usa-button:not([disabled]).usa-focus{\n  outline-offset:0.25rem;\n}\n.fba-modal-dialog .usa-button:disabled, .fba-modal-dialog .usa-button[aria-disabled=true]{\n  color:#454545;\n  background-color:#c9c9c9;\n  cursor:not-allowed;\n  opacity:1;\n}\n.fba-modal-dialog .usa-button:disabled:hover, .fba-modal-dialog .usa-button:disabled:active, .fba-modal-dialog .usa-button:disabled:focus, .fba-modal-dialog .usa-button:disabled.usa-focus, .fba-modal-dialog .usa-button[aria-disabled=true]:hover, .fba-modal-dialog .usa-button[aria-disabled=true]:active, .fba-modal-dialog .usa-button[aria-disabled=true]:focus, .fba-modal-dialog .usa-button[aria-disabled=true].usa-focus{\n  color:#454545;\n  background-color:#c9c9c9;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-button:disabled, .fba-modal-dialog .usa-button[aria-disabled=true]{\n    border:0;\n    color:GrayText;\n  }\n  .fba-modal-dialog .usa-button:disabled:hover, .fba-modal-dialog .usa-button:disabled:active, .fba-modal-dialog .usa-button:disabled:focus, .fba-modal-dialog .usa-button:disabled.usa-focus, .fba-modal-dialog .usa-button[aria-disabled=true]:hover, .fba-modal-dialog .usa-button[aria-disabled=true]:active, .fba-modal-dialog .usa-button[aria-disabled=true]:focus, .fba-modal-dialog .usa-button[aria-disabled=true].usa-focus{\n    color:GrayText;\n  }\n}\n.fba-modal-dialog .usa-button:disabled.usa-button--hover, .fba-modal-dialog .usa-button:disabled.usa-button--active, .fba-modal-dialog .usa-button[aria-disabled=true].usa-button--hover, .fba-modal-dialog .usa-button[aria-disabled=true].usa-button--active{\n  color:#454545;\n  background-color:#c9c9c9;\n  cursor:not-allowed;\n  opacity:1;\n}\n.fba-modal-dialog .usa-button:disabled.usa-button--hover:hover, .fba-modal-dialog .usa-button:disabled.usa-button--hover:active, .fba-modal-dialog .usa-button:disabled.usa-button--hover:focus, .fba-modal-dialog .usa-button:disabled.usa-button--hover.usa-focus, .fba-modal-dialog .usa-button:disabled.usa-button--active:hover, .fba-modal-dialog .usa-button:disabled.usa-button--active:active, .fba-modal-dialog .usa-button:disabled.usa-button--active:focus, .fba-modal-dialog .usa-button:disabled.usa-button--active.usa-focus, .fba-modal-dialog .usa-button[aria-disabled=true].usa-button--hover:hover, .fba-modal-dialog .usa-button[aria-disabled=true].usa-button--hover:active, .fba-modal-dialog .usa-button[aria-disabled=true].usa-button--hover:focus, .fba-modal-dialog .usa-button[aria-disabled=true].usa-button--hover.usa-focus, .fba-modal-dialog .usa-button[aria-disabled=true].usa-button--active:hover, .fba-modal-dialog .usa-button[aria-disabled=true].usa-button--active:active, .fba-modal-dialog .usa-button[aria-disabled=true].usa-button--active:focus, .fba-modal-dialog .usa-button[aria-disabled=true].usa-button--active.usa-focus{\n  color:#454545;\n  background-color:#c9c9c9;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-button:disabled.usa-button--hover, .fba-modal-dialog .usa-button:disabled.usa-button--active, .fba-modal-dialog .usa-button[aria-disabled=true].usa-button--hover, .fba-modal-dialog .usa-button[aria-disabled=true].usa-button--active{\n    border:0;\n    color:GrayText;\n  }\n  .fba-modal-dialog .usa-button:disabled.usa-button--hover:hover, .fba-modal-dialog .usa-button:disabled.usa-button--hover:active, .fba-modal-dialog .usa-button:disabled.usa-button--hover:focus, .fba-modal-dialog .usa-button:disabled.usa-button--hover.usa-focus, .fba-modal-dialog .usa-button:disabled.usa-button--active:hover, .fba-modal-dialog .usa-button:disabled.usa-button--active:active, .fba-modal-dialog .usa-button:disabled.usa-button--active:focus, .fba-modal-dialog .usa-button:disabled.usa-button--active.usa-focus, .fba-modal-dialog .usa-button[aria-disabled=true].usa-button--hover:hover, .fba-modal-dialog .usa-button[aria-disabled=true].usa-button--hover:active, .fba-modal-dialog .usa-button[aria-disabled=true].usa-button--hover:focus, .fba-modal-dialog .usa-button[aria-disabled=true].usa-button--hover.usa-focus, .fba-modal-dialog .usa-button[aria-disabled=true].usa-button--active:hover, .fba-modal-dialog .usa-button[aria-disabled=true].usa-button--active:active, .fba-modal-dialog .usa-button[aria-disabled=true].usa-button--active:focus, .fba-modal-dialog .usa-button[aria-disabled=true].usa-button--active.usa-focus{\n    color:GrayText;\n  }\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-button:disabled:not(.usa-button--unstyled), .fba-modal-dialog .usa-button[aria-disabled=true]:not(.usa-button--unstyled){\n    border:2px solid GrayText;\n  }\n}\n.fba-modal-dialog .usa-button .usa-icon{\n  flex-shrink:0;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-button:not(.usa-button--unstyled){\n    border:2px solid transparent;\n  }\n}\n\n.fba-modal-dialog .usa-button--accent-cool{\n  color:#1b1b1b;\n  background-color:#00bde3;\n}\n.fba-modal-dialog .usa-button--accent-cool:visited{\n  color:#1b1b1b;\n  background-color:#00bde3;\n}\n.fba-modal-dialog .usa-button--accent-cool:hover, .fba-modal-dialog .usa-button--accent-cool.usa-button--hover{\n  color:#1b1b1b;\n  background-color:#28a0cb;\n}\n.fba-modal-dialog .usa-button--accent-cool:active, .fba-modal-dialog .usa-button--accent-cool.usa-button--active{\n  color:white;\n  background-color:#07648d;\n}\n\n.fba-modal-dialog .usa-button--accent-warm{\n  color:#1b1b1b;\n  background-color:#fa9441;\n}\n.fba-modal-dialog .usa-button--accent-warm:visited{\n  color:#1b1b1b;\n  background-color:#fa9441;\n}\n.fba-modal-dialog .usa-button--accent-warm:hover, .fba-modal-dialog .usa-button--accent-warm.usa-button--hover{\n  color:white;\n  background-color:#c05600;\n}\n.fba-modal-dialog .usa-button--accent-warm:active, .fba-modal-dialog .usa-button--accent-warm.usa-button--active{\n  color:white;\n  background-color:#775540;\n}\n\n.fba-modal-dialog .usa-button--outline{\n  background-color:transparent;\n  box-shadow:inset 0 0 0 2px #005ea2;\n  color:#005ea2;\n}\n.fba-modal-dialog .usa-button--outline:visited{\n  color:#005ea2;\n}\n.fba-modal-dialog .usa-button--outline:hover, .fba-modal-dialog .usa-button--outline.usa-button--hover{\n  background-color:transparent;\n  box-shadow:inset 0 0 0 2px #1a4480;\n  color:#1a4480;\n}\n.fba-modal-dialog .usa-button--outline:active, .fba-modal-dialog .usa-button--outline.usa-button--active{\n  background-color:transparent;\n  box-shadow:inset 0 0 0 2px #162e51;\n  color:#162e51;\n}\n.fba-modal-dialog .usa-button--outline.usa-button--inverse{\n  box-shadow:inset 0 0 0 2px #dfe1e2;\n  color:#dfe1e2;\n}\n.fba-modal-dialog .usa-button--outline.usa-button--inverse:visited{\n  color:#dfe1e2;\n}\n.fba-modal-dialog .usa-button--outline.usa-button--inverse:hover, .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--hover{\n  box-shadow:inset 0 0 0 2px #f0f0f0;\n  color:#f0f0f0;\n}\n.fba-modal-dialog .usa-button--outline.usa-button--inverse:active, .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--active{\n  background-color:transparent;\n  box-shadow:inset 0 0 0 2px white;\n  color:white;\n}\n.fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled{\n  color:#005ea2;\n  text-decoration:underline;\n  background-color:transparent;\n  border:0;\n  border-radius:0;\n  box-shadow:none;\n  font-weight:normal;\n  justify-content:normal;\n  text-align:left;\n  margin:0;\n  padding:0;\n  color:#dfe1e2;\n}\n.fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled:visited{\n  color:#54278f;\n}\n.fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled:hover{\n  color:#1a4480;\n}\n.fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled:active{\n  color:#162e51;\n}\n.fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled:focus{\n  outline:0.25rem solid #2491ff;\n  outline-offset:0rem;\n}\n.fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled:hover, .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled.usa-button--hover, .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled:disabled:hover, .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled[aria-disabled=true]:hover, .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled:disabled.usa-button--hover, .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled[aria-disabled=true].usa-button--hover, .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled:active, .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled.usa-button--active, .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled:disabled:active, .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled[aria-disabled=true]:active, .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled:disabled.usa-button--active, .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled[aria-disabled=true].usa-button--active, .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled:disabled:focus, .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled[aria-disabled=true]:focus, .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled:disabled.usa-focus, .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled[aria-disabled=true].usa-focus, .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled:disabled, .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled[aria-disabled=true], .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled.usa-button--disabled{\n  background-color:transparent;\n  box-shadow:none;\n  text-decoration:underline;\n}\n.fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled.usa-button--hover{\n  color:#1a4480;\n}\n.fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled.usa-button--active{\n  color:#162e51;\n}\n.fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled:disabled, .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled[aria-disabled=true], .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled:disabled:hover, .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled[aria-disabled=true]:hover, .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled[aria-disabled=true]:focus{\n  color:#757575;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled:disabled, .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled[aria-disabled=true], .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled:disabled:hover, .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled[aria-disabled=true]:hover, .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled[aria-disabled=true]:focus{\n    color:GrayText;\n  }\n}\n.fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled:visited{\n  color:#dfe1e2;\n}\n.fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled:hover, .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled.usa-button--hover{\n  color:#f0f0f0;\n}\n.fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled:active, .fba-modal-dialog .usa-button--outline.usa-button--inverse.usa-button--unstyled.usa-button--active{\n  color:white;\n}\n\n.fba-modal-dialog .usa-button--base{\n  color:white;\n  background-color:#71767a;\n}\n.fba-modal-dialog .usa-button--base:hover, .fba-modal-dialog .usa-button--base.usa-button--hover{\n  color:white;\n  background-color:#565c65;\n}\n.fba-modal-dialog .usa-button--base:active, .fba-modal-dialog .usa-button--base.usa-button--active{\n  color:white;\n  background-color:#3d4551;\n}\n\n.fba-modal-dialog .usa-button--secondary{\n  color:white;\n  background-color:#d83933;\n}\n.fba-modal-dialog .usa-button--secondary:hover, .fba-modal-dialog .usa-button--secondary.usa-button--hover{\n  color:white;\n  background-color:#b50909;\n}\n.fba-modal-dialog .usa-button--secondary:active, .fba-modal-dialog .usa-button--secondary.usa-button--active{\n  color:white;\n  background-color:#8b0a03;\n}\n\n.fba-modal-dialog .usa-button--big{\n  border-radius:0.25rem;\n  font-size:1.46rem;\n  padding:1rem 1.5rem;\n}\n\n.fba-modal-dialog .usa-button--outline:disabled, .fba-modal-dialog .usa-button--outline:disabled:hover, .fba-modal-dialog .usa-button--outline:disabled:active, .fba-modal-dialog .usa-button--outline:disabled:focus, .fba-modal-dialog .usa-button--outline[aria-disabled=true], .fba-modal-dialog .usa-button--outline[aria-disabled=true]:hover, .fba-modal-dialog .usa-button--outline[aria-disabled=true]:active, .fba-modal-dialog .usa-button--outline[aria-disabled=true]:focus, .fba-modal-dialog .usa-button--outline-inverse:disabled, .fba-modal-dialog .usa-button--outline-inverse:disabled:hover, .fba-modal-dialog .usa-button--outline-inverse:disabled:active, .fba-modal-dialog .usa-button--outline-inverse:disabled:focus, .fba-modal-dialog .usa-button--outline-inverse[aria-disabled=true], .fba-modal-dialog .usa-button--outline-inverse[aria-disabled=true]:hover, .fba-modal-dialog .usa-button--outline-inverse[aria-disabled=true]:active, .fba-modal-dialog .usa-button--outline-inverse[aria-disabled=true]:focus{\n  background-color:transparent;\n  color:#757575;\n}\n\n.fba-modal-dialog .usa-button--outline:disabled,\n.fba-modal-dialog .usa-button--outline[aria-disabled=true]{\n  box-shadow:inset 0 0 0 2px #c9c9c9;\n}\n.fba-modal-dialog .usa-button--outline:disabled.usa-button--inverse,\n.fba-modal-dialog .usa-button--outline[aria-disabled=true].usa-button--inverse{\n  box-shadow:inset 0 0 0 2px #919191;\n  color:#919191;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-button--outline:disabled.usa-button--inverse,\n  .fba-modal-dialog .usa-button--outline[aria-disabled=true].usa-button--inverse{\n    color:GrayText;\n  }\n}\n\n.fba-modal-dialog .usa-button--unstyled{\n  color:#005ea2;\n  text-decoration:underline;\n  background-color:transparent;\n  border:0;\n  border-radius:0;\n  box-shadow:none;\n  font-weight:normal;\n  justify-content:normal;\n  text-align:left;\n  margin:0;\n  padding:0;\n}\n.fba-modal-dialog .usa-button--unstyled:visited{\n  color:#54278f;\n}\n.fba-modal-dialog .usa-button--unstyled:hover{\n  color:#1a4480;\n}\n.fba-modal-dialog .usa-button--unstyled:active{\n  color:#162e51;\n}\n.fba-modal-dialog .usa-button--unstyled:focus{\n  outline:0.25rem solid #2491ff;\n  outline-offset:0rem;\n}\n.fba-modal-dialog .usa-button--unstyled:hover, .fba-modal-dialog .usa-button--unstyled.usa-button--hover, .fba-modal-dialog .usa-button--unstyled:disabled:hover, .fba-modal-dialog .usa-button--unstyled[aria-disabled=true]:hover, .fba-modal-dialog .usa-button--unstyled:disabled.usa-button--hover, .fba-modal-dialog .usa-button--unstyled[aria-disabled=true].usa-button--hover, .fba-modal-dialog .usa-button--unstyled:active, .fba-modal-dialog .usa-button--unstyled.usa-button--active, .fba-modal-dialog .usa-button--unstyled:disabled:active, .fba-modal-dialog .usa-button--unstyled[aria-disabled=true]:active, .fba-modal-dialog .usa-button--unstyled:disabled.usa-button--active, .fba-modal-dialog .usa-button--unstyled[aria-disabled=true].usa-button--active, .fba-modal-dialog .usa-button--unstyled:disabled:focus, .fba-modal-dialog .usa-button--unstyled[aria-disabled=true]:focus, .fba-modal-dialog .usa-button--unstyled:disabled.usa-focus, .fba-modal-dialog .usa-button--unstyled[aria-disabled=true].usa-focus, .fba-modal-dialog .usa-button--unstyled:disabled, .fba-modal-dialog .usa-button--unstyled[aria-disabled=true], .fba-modal-dialog .usa-button--unstyled.usa-button--disabled{\n  background-color:transparent;\n  box-shadow:none;\n  text-decoration:underline;\n}\n.fba-modal-dialog .usa-button--unstyled.usa-button--hover{\n  color:#1a4480;\n}\n.fba-modal-dialog .usa-button--unstyled.usa-button--active{\n  color:#162e51;\n}\n.fba-modal-dialog .usa-button--unstyled:disabled, .fba-modal-dialog .usa-button--unstyled[aria-disabled=true], .fba-modal-dialog .usa-button--unstyled:disabled:hover, .fba-modal-dialog .usa-button--unstyled[aria-disabled=true]:hover, .fba-modal-dialog .usa-button--unstyled[aria-disabled=true]:focus{\n  color:#757575;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-button--unstyled:disabled, .fba-modal-dialog .usa-button--unstyled[aria-disabled=true], .fba-modal-dialog .usa-button--unstyled:disabled:hover, .fba-modal-dialog .usa-button--unstyled[aria-disabled=true]:hover, .fba-modal-dialog .usa-button--unstyled[aria-disabled=true]:focus{\n    color:GrayText;\n  }\n}\n\n.fba-modal-dialog .usa-character-count__status{\n  display:inline-block;\n  padding-top:0.25rem;\n}\n.fba-modal-dialog .usa-character-count__status.usa-character-count__status--invalid{\n  color:#b50909;\n  font-weight:700;\n}\n\n.fba-modal-dialog .usa-checkbox{\n  background:white;\n}\n\n.fba-modal-dialog .usa-checkbox__label{\n  color:#1b1b1b;\n}\n.fba-modal-dialog .usa-checkbox__label::before{\n  background:white;\n  box-shadow:0 0 0 2px #1b1b1b;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-checkbox__label::before{\n    outline:2px solid transparent;\n    outline-offset:2px;\n  }\n}\n\n.fba-modal-dialog .usa-checkbox__input:checked + [class*=__label]::before{\n  background-color:#005ea2;\n  box-shadow:0 0 0 2px #005ea2;\n}\n.fba-modal-dialog .usa-checkbox__input:disabled + [class*=__label], .fba-modal-dialog .usa-checkbox__input[aria-disabled=true] + [class*=__label]{\n  color:#757575;\n  cursor:not-allowed;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-checkbox__input:disabled + [class*=__label], .fba-modal-dialog .usa-checkbox__input[aria-disabled=true] + [class*=__label]{\n    color:GrayText;\n  }\n}\n.fba-modal-dialog .usa-checkbox__input:disabled + [class*=__label]::before, .fba-modal-dialog .usa-checkbox__input[aria-disabled=true] + [class*=__label]::before{\n  background-color:white;\n  box-shadow:0 0 0 2px #757575;\n}\n.fba-modal-dialog .usa-checkbox__input--tile + [class*=__label]{\n  background-color:white;\n  border:2px solid #c9c9c9;\n  color:#1b1b1b;\n}\n.fba-modal-dialog .usa-checkbox__input--tile:checked + [class*=__label]{\n  background-color:rgba(0, 94, 162, 0.1);\n  border-color:#005ea2;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-checkbox__input--tile:checked + [class*=__label]{\n    border:ButtonText solid 0.25rem;\n  }\n}\n.fba-modal-dialog .usa-checkbox__input--tile:disabled + [class*=__label], .fba-modal-dialog .usa-checkbox__input--tile[aria-disabled=true] + [class*=__label]{\n  border-color:#e6e6e6;\n}\n.fba-modal-dialog .usa-checkbox__input--tile:disabled:checked + [class*=__label], .fba-modal-dialog .usa-checkbox__input--tile:disabled:indeterminate + [class*=__label], .fba-modal-dialog .usa-checkbox__input--tile:disabled[data-indeterminate] + [class*=__label], .fba-modal-dialog .usa-checkbox__input--tile[aria-disabled=true]:checked + [class*=__label], .fba-modal-dialog .usa-checkbox__input--tile[aria-disabled=true]:indeterminate + [class*=__label], .fba-modal-dialog .usa-checkbox__input--tile[aria-disabled=true][data-indeterminate] + [class*=__label]{\n  background-color:white;\n}\n\n.fba-modal-dialog .usa-checkbox__input:indeterminate + [class*=__label]::before, .fba-modal-dialog .usa-checkbox__input[data-indeterminate] + [class*=__label]::before{\n  background-image:url(\"https://touchpoints.app.cloud.gov/img/checkbox-indeterminate.svg\"), linear-gradient(transparent, transparent);\n  background-repeat:no-repeat;\n  background-color:#005ea2;\n  box-shadow:0 0 0 2px #005ea2;\n  background-position:center center;\n  background-size:0.75rem auto;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-checkbox__input:indeterminate + [class*=__label]::before, .fba-modal-dialog .usa-checkbox__input[data-indeterminate] + [class*=__label]::before{\n    background-image:url(\"https://touchpoints.app.cloud.gov/img/checkbox-indeterminate-alt.svg\"), linear-gradient(transparent, transparent);\n    background-repeat:no-repeat;\n    background-color:SelectedItem;\n  }\n}\n.fba-modal-dialog .usa-checkbox__input:indeterminate:disabled + [class*=__label]::before, .fba-modal-dialog .usa-checkbox__input:indeterminate[aria-disabled=true] + [class*=__label]::before, .fba-modal-dialog .usa-checkbox__input[data-indeterminate]:disabled + [class*=__label]::before, .fba-modal-dialog .usa-checkbox__input[data-indeterminate][aria-disabled=true] + [class*=__label]::before{\n  box-shadow:0 0 0 2px #757575;\n}\n.fba-modal-dialog .usa-checkbox__input:indeterminate:disabled + [class*=__label], .fba-modal-dialog .usa-checkbox__input:indeterminate[aria-disabled=true] + [class*=__label], .fba-modal-dialog .usa-checkbox__input[data-indeterminate]:disabled + [class*=__label], .fba-modal-dialog .usa-checkbox__input[data-indeterminate][aria-disabled=true] + [class*=__label]{\n  border-color:#e6e6e6;\n}\n.fba-modal-dialog .usa-checkbox__input--tile:indeterminate + [class*=__label], .fba-modal-dialog .usa-checkbox__input--tile[data-indeterminate] + [class*=__label]{\n  background-color:rgba(0, 94, 162, 0.1);\n  border-color:#005ea2;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-checkbox__input--tile:indeterminate + [class*=__label], .fba-modal-dialog .usa-checkbox__input--tile[data-indeterminate] + [class*=__label]{\n    border:ButtonText solid 0.25rem;\n  }\n}\n.fba-modal-dialog .usa-checkbox__input:checked + [class*=__label]::before, .fba-modal-dialog .usa-checkbox__input:checked:disabled + [class*=__label]::before, .fba-modal-dialog .usa-checkbox__input:checked[aria-disabled=true] + [class*=__label]::before{\n  background-image:url(\"https://touchpoints.app.cloud.gov/img/correct8.svg\"), linear-gradient(transparent, transparent);\n  background-repeat:no-repeat;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-checkbox__input:checked + [class*=__label]::before, .fba-modal-dialog .usa-checkbox__input:checked:disabled + [class*=__label]::before, .fba-modal-dialog .usa-checkbox__input:checked[aria-disabled=true] + [class*=__label]::before{\n    background-image:url(\"https://touchpoints.app.cloud.gov/img/correct8-alt.svg\"), linear-gradient(transparent, transparent);\n    background-repeat:no-repeat;\n  }\n}\n.fba-modal-dialog .usa-checkbox__input:checked:disabled + [class*=__label]::before, .fba-modal-dialog .usa-checkbox__input:checked[aria-disabled=true] + [class*=__label]::before, .fba-modal-dialog .usa-checkbox__input:indeterminate:disabled + [class*=__label]::before, .fba-modal-dialog .usa-checkbox__input:indeterminate[aria-disabled=true] + [class*=__label]::before, .fba-modal-dialog .usa-checkbox__input[data-indeterminate]:disabled + [class*=__label]::before, .fba-modal-dialog .usa-checkbox__input[data-indeterminate][aria-disabled=true] + [class*=__label]::before{\n  background-color:#757575;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-checkbox__input:checked:disabled + [class*=__label]::before, .fba-modal-dialog .usa-checkbox__input:checked[aria-disabled=true] + [class*=__label]::before, .fba-modal-dialog .usa-checkbox__input:indeterminate:disabled + [class*=__label]::before, .fba-modal-dialog .usa-checkbox__input:indeterminate[aria-disabled=true] + [class*=__label]::before, .fba-modal-dialog .usa-checkbox__input[data-indeterminate]:disabled + [class*=__label]::before, .fba-modal-dialog .usa-checkbox__input[data-indeterminate][aria-disabled=true] + [class*=__label]::before{\n    background-color:GrayText;\n  }\n}\n\n.fba-modal-dialog .usa-checkbox__input{\n  position:absolute;\n  left:-999em;\n  right:auto;\n}\n.fba-modal-dialog .usa-checkbox__input:focus + [class*=__label]::before{\n  outline:0.25rem solid #2491ff;\n  outline-offset:0.25rem;\n}\n.fba-modal-dialog .usa-checkbox__input--tile + [class*=__label]{\n  border-radius:0.25rem;\n  margin-top:0.5rem;\n  padding:0.75rem 1rem 0.75rem 2.5rem;\n}\n.fba-modal-dialog .usa-checkbox__input--tile + [class*=__label]::before{\n  left:0.5rem;\n}\n\n.fba-modal-dialog .usa-checkbox__input:checked + [class*=__label]::before{\n  background-position:center center;\n  background-size:0.75rem auto;\n}\n@media print{\n  .fba-modal-dialog .usa-checkbox__input:checked + [class*=__label]::before{\n    background-image:none;\n    background-color:white;\n    content:\"✔\";\n    text-align:center;\n  }\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-checkbox__input:checked + [class*=__label]::before{\n    background-color:SelectedItem;\n  }\n}\n\n.fba-modal-dialog .usa-checkbox__label{\n  cursor:pointer;\n  display:inherit;\n  font-weight:normal;\n  margin-top:0.75rem;\n  padding-left:2rem;\n  position:relative;\n}\n.fba-modal-dialog .usa-checkbox__label::before{\n  content:\" \";\n  display:block;\n  left:0;\n  margin-left:2px;\n  margin-top:0.064rem;\n  position:absolute;\n}\n\n.fba-modal-dialog .usa-checkbox__label::before{\n  height:1.25rem;\n  width:1.25rem;\n  border-radius:2px;\n}\n\n.fba-modal-dialog .usa-checkbox__label-description{\n  display:block;\n  font-size:0.93rem;\n  margin-top:0.5rem;\n}\n.fba-modal-dialog .usa-checklist{\n  margin-bottom:0;\n  margin-top:0;\n  list-style-type:none;\n  padding-left:0;\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:1.06rem;\n  line-height:1.5;\n}\n\n.fba-modal-dialog .usa-checklist__item{\n  text-indent:-2.5rem;\n  margin-bottom:0;\n  margin-top:0;\n  margin-bottom:0;\n  margin-top:0.5rem;\n}\n.fba-modal-dialog .usa-checklist__item::before{\n  content:\" \";\n  display:inline-block;\n  height:1rem;\n  margin-left:-0.25rem;\n  margin-right:0.75rem;\n  width:2rem;\n}\n.fba-modal-dialog .usa-checklist__item.usa-checklist__item--checked::before{\n  background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons-bg/check--blue-60v.svg\"), linear-gradient(transparent, transparent);\n  background-repeat:no-repeat;\n  background-position:center;\n  background-size:1.5rem;\n}\n\n.fba-modal-dialog .usa-combo-box{\n  max-width:30rem;\n  position:relative;\n}\n\n.fba-modal-dialog .usa-combo-box--pristine .usa-combo-box__input{\n  padding-right:calc(5em + 4px);\n}\n.fba-modal-dialog .usa-combo-box--pristine .usa-combo-box__input::-ms-clear{\n  display:none;\n}\n.fba-modal-dialog .usa-combo-box--pristine .usa-combo-box__clear-input{\n  display:block;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-combo-box--pristine .usa-combo-box__clear-input{\n    background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/close.svg\");\n    background-repeat:no-repeat;\n    background-position:center center;\n    background-size:1rem 1rem;\n    display:inline-block;\n    height:1rem;\n    width:1rem;\n    height:1.5rem;\n    width:auto;\n    top:0.5rem;\n  }\n  @supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n    .fba-modal-dialog .usa-combo-box--pristine .usa-combo-box__clear-input{\n      background:none;\n      background-color:ButtonText;\n      -webkit-mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/close.svg\"), linear-gradient(transparent, transparent);\n              mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/close.svg\"), linear-gradient(transparent, transparent);\n      -webkit-mask-position:center center;\n              mask-position:center center;\n      -webkit-mask-repeat:no-repeat;\n              mask-repeat:no-repeat;\n      -webkit-mask-size:1rem 1rem;\n              mask-size:1rem 1rem;\n    }\n  }\n}\n\n.fba-modal-dialog .usa-combo-box__input{\n  -webkit-appearance:none;\n     -moz-appearance:none;\n          appearance:none;\n  margin-bottom:0;\n  max-width:none;\n  padding-right:calc(2.5em + 3px);\n}\n.fba-modal-dialog .usa-combo-box__input:disabled, .fba-modal-dialog .usa-combo-box__input[aria-disabled=true]{\n  color:#454545;\n  background-color:#c9c9c9;\n  cursor:not-allowed;\n  opacity:1;\n  -webkit-text-fill-color:#454545;\n}\n.fba-modal-dialog .usa-combo-box__input:disabled:hover, .fba-modal-dialog .usa-combo-box__input:disabled:active, .fba-modal-dialog .usa-combo-box__input:disabled:focus, .fba-modal-dialog .usa-combo-box__input:disabled.usa-focus, .fba-modal-dialog .usa-combo-box__input[aria-disabled=true]:hover, .fba-modal-dialog .usa-combo-box__input[aria-disabled=true]:active, .fba-modal-dialog .usa-combo-box__input[aria-disabled=true]:focus, .fba-modal-dialog .usa-combo-box__input[aria-disabled=true].usa-focus{\n  color:#454545;\n  background-color:#c9c9c9;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-combo-box__input:disabled, .fba-modal-dialog .usa-combo-box__input[aria-disabled=true]{\n    border:0;\n    color:GrayText;\n  }\n  .fba-modal-dialog .usa-combo-box__input:disabled:hover, .fba-modal-dialog .usa-combo-box__input:disabled:active, .fba-modal-dialog .usa-combo-box__input:disabled:focus, .fba-modal-dialog .usa-combo-box__input:disabled.usa-focus, .fba-modal-dialog .usa-combo-box__input[aria-disabled=true]:hover, .fba-modal-dialog .usa-combo-box__input[aria-disabled=true]:active, .fba-modal-dialog .usa-combo-box__input[aria-disabled=true]:focus, .fba-modal-dialog .usa-combo-box__input[aria-disabled=true].usa-focus{\n    color:GrayText;\n  }\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-combo-box__input:disabled, .fba-modal-dialog .usa-combo-box__input[aria-disabled=true]{\n    border:2px solid GrayText;\n  }\n}\n.fba-modal-dialog .usa-combo-box__input:disabled::-moz-placeholder, .fba-modal-dialog .usa-combo-box__input[aria-disabled=true]::-moz-placeholder{\n  opacity:1;\n}\n.fba-modal-dialog .usa-combo-box__input:disabled::placeholder, .fba-modal-dialog .usa-combo-box__input[aria-disabled=true]::placeholder{\n  opacity:1;\n}\n.fba-modal-dialog .usa-combo-box__input:disabled ~ .usa-combo-box__input-button-separator, .fba-modal-dialog .usa-combo-box__input[aria-disabled=true] ~ .usa-combo-box__input-button-separator{\n  background-color:#454545;\n  cursor:not-allowed;\n}\n\n.fba-modal-dialog button.usa-combo-box__toggle-list:focus,\n.fba-modal-dialog button.usa-combo-box__clear-input:focus{\n  outline-offset:-4px;\n}\n.fba-modal-dialog button.usa-combo-box__toggle-list:disabled, .fba-modal-dialog button.usa-combo-box__toggle-list[aria-disabled=true], .fba-modal-dialog button.usa-combo-box__clear-input:disabled, .fba-modal-dialog button.usa-combo-box__clear-input[aria-disabled=true]{\n  cursor:not-allowed;\n}\n.fba-modal-dialog .usa-combo-box__toggle-list__wrapper:focus,\n.fba-modal-dialog .usa-combo-box__clear-input__wrapper:focus{\n  outline:0;\n}\n.fba-modal-dialog .usa-combo-box__toggle-list,\n.fba-modal-dialog .usa-combo-box__clear-input{\n  background-color:transparent;\n  background-position:center;\n  background-size:auto 1.5rem;\n  border:0;\n  bottom:1px;\n  cursor:pointer;\n  margin-bottom:0;\n  opacity:0.6;\n  padding-right:2rem;\n  position:absolute;\n  top:1px;\n  z-index:100;\n}\n\n.fba-modal-dialog .usa-combo-box__clear-input{\n  background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/close.svg\"), linear-gradient(transparent, transparent);\n  background-repeat:no-repeat;\n  display:none;\n  right:calc(2.5em + 3px);\n}\n\n.fba-modal-dialog .usa-combo-box__toggle-list{\n  background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/expand_more.svg\"), linear-gradient(transparent, transparent);\n  background-repeat:no-repeat;\n  background-size:auto 2rem;\n  right:1px;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-combo-box__toggle-list{\n    background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/expand_more.svg\");\n    background-repeat:no-repeat;\n    background-position:center center;\n    background-size:1rem 1rem;\n    display:inline-block;\n    height:1rem;\n    width:1rem;\n    height:auto;\n    width:auto;\n  }\n  @supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n    .fba-modal-dialog .usa-combo-box__toggle-list{\n      background:none;\n      background-color:ButtonText;\n      -webkit-mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/expand_more.svg\"), linear-gradient(transparent, transparent);\n              mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/expand_more.svg\"), linear-gradient(transparent, transparent);\n      -webkit-mask-position:center center;\n              mask-position:center center;\n      -webkit-mask-repeat:no-repeat;\n              mask-repeat:no-repeat;\n      -webkit-mask-size:1rem 1rem;\n              mask-size:1rem 1rem;\n    }\n  }\n  .fba-modal-dialog .usa-combo-box__toggle-list:disabled, .fba-modal-dialog .usa-combo-box__toggle-list[aria-disabled=true]{\n    background-color:GrayText;\n  }\n}\n\n.fba-modal-dialog .usa-combo-box__input-button-separator{\n  background-color:#c6cace;\n  position:absolute;\n  top:1px;\n  height:calc(100% - 1rem);\n  margin-bottom:0.5rem;\n  margin-top:0.5rem;\n  width:1px;\n  right:calc(2.5em + 2px);\n  box-sizing:border-box;\n  z-index:200;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-combo-box__input-button-separator{\n    background-color:ButtonText;\n  }\n}\n\n.fba-modal-dialog .usa-combo-box__list{\n  border-width:1px;\n  border-color:#565c65;\n  border-style:solid;\n  background-color:white;\n  border-radius:0;\n  border-top:0;\n  margin:0;\n  max-height:12.1em;\n  overflow-x:hidden;\n  overflow-y:scroll;\n  padding:0;\n  position:absolute;\n  width:100%;\n  z-index:300;\n}\n.fba-modal-dialog .usa-combo-box__list:focus{\n  outline:0;\n}\n\n.fba-modal-dialog .usa-combo-box__list-option{\n  border-bottom:1px solid #dfe1e2;\n  cursor:pointer;\n  display:block;\n  padding:0.5rem;\n}\n.fba-modal-dialog .usa-combo-box__list-option--focused{\n  outline:2px solid #162e51;\n  outline-offset:-2px;\n  position:relative;\n  z-index:100;\n}\n.fba-modal-dialog .usa-combo-box__list-option--focused:focus{\n  outline-offset:-4px;\n}\n.fba-modal-dialog .usa-combo-box__list-option--selected{\n  background-color:#005ea2;\n  border-color:#005ea2;\n  color:white;\n}\n\n.fba-modal-dialog .usa-combo-box__list-option--no-results{\n  cursor:not-allowed;\n  display:block;\n  padding:0.5rem;\n}\n\n.fba-modal-dialog .usa-date-picker__wrapper{\n  display:none;\n  position:relative;\n  max-width:30rem;\n}\n.fba-modal-dialog .usa-date-picker__wrapper:focus{\n  outline:0;\n}\n\n.fba-modal-dialog .usa-date-picker__external-input[aria-disabled=true] + .usa-date-picker__button, .fba-modal-dialog .usa-date-picker__calendar__year:disabled, .fba-modal-dialog .usa-date-picker__calendar__previous-year-chunk:disabled, .fba-modal-dialog .usa-date-picker__calendar__next-year-chunk:disabled, .fba-modal-dialog .usa-date-picker__calendar__month:disabled, .fba-modal-dialog .usa-date-picker__calendar__year-selection:disabled, .fba-modal-dialog .usa-date-picker__calendar__month-selection:disabled, .fba-modal-dialog .usa-date-picker__calendar__date:disabled, .fba-modal-dialog .usa-date-picker__calendar__previous-year:disabled, .fba-modal-dialog .usa-date-picker__calendar__previous-month:disabled, .fba-modal-dialog .usa-date-picker__calendar__next-year:disabled, .fba-modal-dialog .usa-date-picker__calendar__next-month:disabled, .fba-modal-dialog .usa-date-picker__button:disabled, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__year, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__previous-year-chunk, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__next-year-chunk, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__month, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__year-selection, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__month-selection, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__date, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__previous-year, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__previous-month, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__next-year, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__next-month, .fba-modal-dialog [aria-disabled=true].usa-date-picker__button{\n  cursor:not-allowed;\n  opacity:0.6;\n}\n.fba-modal-dialog .usa-date-picker__external-input[aria-disabled=true] + .usa-date-picker__button:hover, .fba-modal-dialog .usa-date-picker__calendar__year:hover:disabled, .fba-modal-dialog .usa-date-picker__calendar__previous-year-chunk:hover:disabled, .fba-modal-dialog .usa-date-picker__calendar__next-year-chunk:hover:disabled, .fba-modal-dialog .usa-date-picker__calendar__month:hover:disabled, .fba-modal-dialog .usa-date-picker__calendar__year-selection:hover:disabled, .fba-modal-dialog .usa-date-picker__calendar__month-selection:hover:disabled, .fba-modal-dialog .usa-date-picker__calendar__date:hover:disabled, .fba-modal-dialog .usa-date-picker__calendar__previous-year:hover:disabled, .fba-modal-dialog .usa-date-picker__calendar__previous-month:hover:disabled, .fba-modal-dialog .usa-date-picker__calendar__next-year:hover:disabled, .fba-modal-dialog .usa-date-picker__calendar__next-month:hover:disabled, .fba-modal-dialog .usa-date-picker__button:hover:disabled, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__year:hover, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__previous-year-chunk:hover, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__next-year-chunk:hover, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__month:hover, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__year-selection:hover, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__month-selection:hover, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__date:hover, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__previous-year:hover, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__previous-month:hover, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__next-year:hover, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__next-month:hover, .fba-modal-dialog [aria-disabled=true].usa-date-picker__button:hover{\n  background-color:initial;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-date-picker__external-input[aria-disabled=true] + .usa-date-picker__button, .fba-modal-dialog .usa-date-picker__calendar__year:disabled, .fba-modal-dialog .usa-date-picker__calendar__previous-year-chunk:disabled, .fba-modal-dialog .usa-date-picker__calendar__next-year-chunk:disabled, .fba-modal-dialog .usa-date-picker__calendar__month:disabled, .fba-modal-dialog .usa-date-picker__calendar__year-selection:disabled, .fba-modal-dialog .usa-date-picker__calendar__month-selection:disabled, .fba-modal-dialog .usa-date-picker__calendar__date:disabled, .fba-modal-dialog .usa-date-picker__calendar__previous-year:disabled, .fba-modal-dialog .usa-date-picker__calendar__previous-month:disabled, .fba-modal-dialog .usa-date-picker__calendar__next-year:disabled, .fba-modal-dialog .usa-date-picker__calendar__next-month:disabled, .fba-modal-dialog .usa-date-picker__button:disabled, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__year, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__previous-year-chunk, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__next-year-chunk, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__month, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__year-selection, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__month-selection, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__date, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__previous-year, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__previous-month, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__next-year, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__next-month, .fba-modal-dialog [aria-disabled=true].usa-date-picker__button{\n    background-color:GrayText;\n  }\n  .fba-modal-dialog .usa-date-picker__external-input[aria-disabled=true] + .usa-date-picker__button:hover, .fba-modal-dialog .usa-date-picker__calendar__year:hover:disabled, .fba-modal-dialog .usa-date-picker__calendar__previous-year-chunk:hover:disabled, .fba-modal-dialog .usa-date-picker__calendar__next-year-chunk:hover:disabled, .fba-modal-dialog .usa-date-picker__calendar__month:hover:disabled, .fba-modal-dialog .usa-date-picker__calendar__year-selection:hover:disabled, .fba-modal-dialog .usa-date-picker__calendar__month-selection:hover:disabled, .fba-modal-dialog .usa-date-picker__calendar__date:hover:disabled, .fba-modal-dialog .usa-date-picker__calendar__previous-year:hover:disabled, .fba-modal-dialog .usa-date-picker__calendar__previous-month:hover:disabled, .fba-modal-dialog .usa-date-picker__calendar__next-year:hover:disabled, .fba-modal-dialog .usa-date-picker__calendar__next-month:hover:disabled, .fba-modal-dialog .usa-date-picker__button:hover:disabled, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__year:hover, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__previous-year-chunk:hover, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__next-year-chunk:hover, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__month:hover, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__year-selection:hover, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__month-selection:hover, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__date:hover, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__previous-year:hover, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__previous-month:hover, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__next-year:hover, .fba-modal-dialog [aria-disabled=true].usa-date-picker__calendar__next-month:hover, .fba-modal-dialog [aria-disabled=true].usa-date-picker__button:hover{\n    background-color:GrayText;\n  }\n}\n\n.fba-modal-dialog .usa-date-picker__calendar__year, .fba-modal-dialog .usa-date-picker__calendar__previous-year-chunk, .fba-modal-dialog .usa-date-picker__calendar__next-year-chunk, .fba-modal-dialog .usa-date-picker__calendar__month, .fba-modal-dialog .usa-date-picker__calendar__year-selection, .fba-modal-dialog .usa-date-picker__calendar__month-selection, .fba-modal-dialog .usa-date-picker__calendar__date, .fba-modal-dialog .usa-date-picker__calendar__previous-year, .fba-modal-dialog .usa-date-picker__calendar__previous-month, .fba-modal-dialog .usa-date-picker__calendar__next-year, .fba-modal-dialog .usa-date-picker__calendar__next-month, .fba-modal-dialog .usa-date-picker__button{\n  background-color:#f0f0f0;\n  border:0;\n  width:100%;\n}\n.fba-modal-dialog .usa-date-picker__calendar__year:not([disabled]), .fba-modal-dialog .usa-date-picker__calendar__previous-year-chunk:not([disabled]), .fba-modal-dialog .usa-date-picker__calendar__next-year-chunk:not([disabled]), .fba-modal-dialog .usa-date-picker__calendar__month:not([disabled]), .fba-modal-dialog .usa-date-picker__calendar__year-selection:not([disabled]), .fba-modal-dialog .usa-date-picker__calendar__month-selection:not([disabled]), .fba-modal-dialog .usa-date-picker__calendar__date:not([disabled]), .fba-modal-dialog .usa-date-picker__calendar__previous-year:not([disabled]), .fba-modal-dialog .usa-date-picker__calendar__previous-month:not([disabled]), .fba-modal-dialog .usa-date-picker__calendar__next-year:not([disabled]), .fba-modal-dialog .usa-date-picker__calendar__next-month:not([disabled]), .fba-modal-dialog .usa-date-picker__button:not([disabled]){\n  cursor:pointer;\n}\n.fba-modal-dialog .usa-date-picker__calendar__year:not([disabled]):focus, .fba-modal-dialog .usa-date-picker__calendar__previous-year-chunk:not([disabled]):focus, .fba-modal-dialog .usa-date-picker__calendar__next-year-chunk:not([disabled]):focus, .fba-modal-dialog .usa-date-picker__calendar__month:not([disabled]):focus, .fba-modal-dialog .usa-date-picker__calendar__year-selection:not([disabled]):focus, .fba-modal-dialog .usa-date-picker__calendar__month-selection:not([disabled]):focus, .fba-modal-dialog .usa-date-picker__calendar__date:not([disabled]):focus, .fba-modal-dialog .usa-date-picker__calendar__previous-year:not([disabled]):focus, .fba-modal-dialog .usa-date-picker__calendar__previous-month:not([disabled]):focus, .fba-modal-dialog .usa-date-picker__calendar__next-year:not([disabled]):focus, .fba-modal-dialog .usa-date-picker__calendar__next-month:not([disabled]):focus, .fba-modal-dialog .usa-date-picker__button:not([disabled]):focus{\n  outline-offset:-4px;\n}\n.fba-modal-dialog .usa-date-picker__calendar__year:not([disabled]):hover, .fba-modal-dialog .usa-date-picker__calendar__previous-year-chunk:not([disabled]):hover, .fba-modal-dialog .usa-date-picker__calendar__next-year-chunk:not([disabled]):hover, .fba-modal-dialog .usa-date-picker__calendar__month:not([disabled]):hover, .fba-modal-dialog .usa-date-picker__calendar__year-selection:not([disabled]):hover, .fba-modal-dialog .usa-date-picker__calendar__month-selection:not([disabled]):hover, .fba-modal-dialog .usa-date-picker__calendar__date:not([disabled]):hover, .fba-modal-dialog .usa-date-picker__calendar__previous-year:not([disabled]):hover, .fba-modal-dialog .usa-date-picker__calendar__previous-month:not([disabled]):hover, .fba-modal-dialog .usa-date-picker__calendar__next-year:not([disabled]):hover, .fba-modal-dialog .usa-date-picker__calendar__next-month:not([disabled]):hover, .fba-modal-dialog .usa-date-picker__button:not([disabled]):hover{\n  background-color:#dfe1e2;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-date-picker__calendar__year:not([disabled]):hover, .fba-modal-dialog .usa-date-picker__calendar__previous-year-chunk:not([disabled]):hover, .fba-modal-dialog .usa-date-picker__calendar__next-year-chunk:not([disabled]):hover, .fba-modal-dialog .usa-date-picker__calendar__month:not([disabled]):hover, .fba-modal-dialog .usa-date-picker__calendar__year-selection:not([disabled]):hover, .fba-modal-dialog .usa-date-picker__calendar__month-selection:not([disabled]):hover, .fba-modal-dialog .usa-date-picker__calendar__date:not([disabled]):hover, .fba-modal-dialog .usa-date-picker__calendar__previous-year:not([disabled]):hover, .fba-modal-dialog .usa-date-picker__calendar__previous-month:not([disabled]):hover, .fba-modal-dialog .usa-date-picker__calendar__next-year:not([disabled]):hover, .fba-modal-dialog .usa-date-picker__calendar__next-month:not([disabled]):hover, .fba-modal-dialog .usa-date-picker__button:not([disabled]):hover{\n    background-color:buttontext;\n  }\n}\n.fba-modal-dialog .usa-date-picker__calendar__year:not([disabled]):active, .fba-modal-dialog .usa-date-picker__calendar__previous-year-chunk:not([disabled]):active, .fba-modal-dialog .usa-date-picker__calendar__next-year-chunk:not([disabled]):active, .fba-modal-dialog .usa-date-picker__calendar__month:not([disabled]):active, .fba-modal-dialog .usa-date-picker__calendar__year-selection:not([disabled]):active, .fba-modal-dialog .usa-date-picker__calendar__month-selection:not([disabled]):active, .fba-modal-dialog .usa-date-picker__calendar__date:not([disabled]):active, .fba-modal-dialog .usa-date-picker__calendar__previous-year:not([disabled]):active, .fba-modal-dialog .usa-date-picker__calendar__previous-month:not([disabled]):active, .fba-modal-dialog .usa-date-picker__calendar__next-year:not([disabled]):active, .fba-modal-dialog .usa-date-picker__calendar__next-month:not([disabled]):active, .fba-modal-dialog .usa-date-picker__button:not([disabled]):active{\n  background-color:#a9aeb1;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-date-picker__calendar__year:not([disabled]):active, .fba-modal-dialog .usa-date-picker__calendar__previous-year-chunk:not([disabled]):active, .fba-modal-dialog .usa-date-picker__calendar__next-year-chunk:not([disabled]):active, .fba-modal-dialog .usa-date-picker__calendar__month:not([disabled]):active, .fba-modal-dialog .usa-date-picker__calendar__year-selection:not([disabled]):active, .fba-modal-dialog .usa-date-picker__calendar__month-selection:not([disabled]):active, .fba-modal-dialog .usa-date-picker__calendar__date:not([disabled]):active, .fba-modal-dialog .usa-date-picker__calendar__previous-year:not([disabled]):active, .fba-modal-dialog .usa-date-picker__calendar__previous-month:not([disabled]):active, .fba-modal-dialog .usa-date-picker__calendar__next-year:not([disabled]):active, .fba-modal-dialog .usa-date-picker__calendar__next-month:not([disabled]):active, .fba-modal-dialog .usa-date-picker__button:not([disabled]):active{\n    background-color:buttontext;\n  }\n}\n.fba-modal-dialog .usa-date-picker--active .usa-date-picker__button{\n  background-color:#f0f0f0;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-date-picker--active .usa-date-picker__button{\n    background-color:buttontext;\n  }\n}\n.fba-modal-dialog .usa-date-picker--active .usa-date-picker__calendar{\n  z-index:400;\n}\n\n.fba-modal-dialog .usa-date-picker__button{\n  background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/calendar_today.svg\"), linear-gradient(transparent, transparent);\n  background-repeat:no-repeat;\n  align-self:stretch;\n  background-color:transparent;\n  background-position:center;\n  background-size:1.5rem;\n  margin-top:0.5em;\n  width:3em;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-date-picker__button{\n    background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/calendar_today.svg\");\n    background-repeat:no-repeat;\n    background-position:center center;\n    background-size:2.5rem 2.5rem;\n    display:inline-block;\n    height:2.5rem;\n    width:3rem;\n    -webkit-mask-size:1.5rem !important;\n            mask-size:1.5rem !important;\n    position:relative;\n  }\n  @supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n    .fba-modal-dialog .usa-date-picker__button{\n      background:none;\n      background-color:ButtonText;\n      -webkit-mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/calendar_today.svg\"), linear-gradient(transparent, transparent);\n              mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/calendar_today.svg\"), linear-gradient(transparent, transparent);\n      -webkit-mask-position:center center;\n              mask-position:center center;\n      -webkit-mask-repeat:no-repeat;\n              mask-repeat:no-repeat;\n      -webkit-mask-size:2.5rem 2.5rem;\n              mask-size:2.5rem 2.5rem;\n    }\n  }\n  .fba-modal-dialog .usa-date-picker__button:not([disabled]):focus, .fba-modal-dialog .usa-date-picker__button:not([disabled]):hover{\n    background-color:Highlight;\n  }\n}\n\n.fba-modal-dialog .usa-date-picker--initialized .usa-date-picker__wrapper{\n  display:flex;\n}\n\n.fba-modal-dialog .usa-date-picker__calendar{\n  background-color:#f0f0f0;\n  left:auto;\n  max-width:20rem;\n  position:absolute;\n  right:0;\n  width:100%;\n  z-index:100;\n}\n.fba-modal-dialog .usa-date-picker__calendar__table{\n  border-spacing:0;\n  border-collapse:collapse;\n  table-layout:fixed;\n  text-align:center;\n  width:100%;\n}\n.fba-modal-dialog .usa-date-picker__calendar__table th{\n  font-weight:normal;\n}\n.fba-modal-dialog .usa-date-picker__calendar__table td{\n  padding:0;\n}\n\n.fba-modal-dialog .usa-date-picker__calendar__row{\n  display:flex;\n  flex-wrap:wrap;\n  text-align:center;\n  width:100%;\n}\n\n.fba-modal-dialog .usa-date-picker__calendar__cell{\n  background-color:#f0f0f0;\n  flex:1;\n}\n\n.fba-modal-dialog .usa-date-picker__calendar__cell--center-items{\n  display:flex;\n  justify-content:center;\n  align-items:center;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-date-picker__calendar__cell--center-items:not([disabled]):hover{\n    outline:2px solid transparent;\n    outline-offset:-2px;\n  }\n}\n\n.fba-modal-dialog .usa-date-picker__calendar__previous-year,\n.fba-modal-dialog .usa-date-picker__calendar__previous-month,\n.fba-modal-dialog .usa-date-picker__calendar__next-year,\n.fba-modal-dialog .usa-date-picker__calendar__next-month{\n  background-position:center;\n  background-size:auto 1.5rem;\n  height:1.5rem;\n  padding:20px 10px;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-date-picker__calendar__previous-year,\n  .fba-modal-dialog .usa-date-picker__calendar__previous-month,\n  .fba-modal-dialog .usa-date-picker__calendar__next-year,\n  .fba-modal-dialog .usa-date-picker__calendar__next-month{\n    -webkit-mask-size:1.5rem !important;\n            mask-size:1.5rem !important;\n  }\n}\n\n.fba-modal-dialog .usa-date-picker__calendar__previous-year:not([disabled]){\n  background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/navigate_far_before.svg\"), linear-gradient(transparent, transparent);\n  background-repeat:no-repeat;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-date-picker__calendar__previous-year:not([disabled]){\n    background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/navigate_far_before.svg\");\n    background-repeat:no-repeat;\n    background-position:center center;\n    background-size:2.5rem 2.5rem;\n    display:inline-block;\n    height:2.5rem;\n    width:3rem;\n    background-color:buttonText;\n  }\n  @supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n    .fba-modal-dialog .usa-date-picker__calendar__previous-year:not([disabled]){\n      background:none;\n      background-color:ButtonText;\n      -webkit-mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/navigate_far_before.svg\"), linear-gradient(transparent, transparent);\n              mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/navigate_far_before.svg\"), linear-gradient(transparent, transparent);\n      -webkit-mask-position:center center;\n              mask-position:center center;\n      -webkit-mask-repeat:no-repeat;\n              mask-repeat:no-repeat;\n      -webkit-mask-size:2.5rem 2.5rem;\n              mask-size:2.5rem 2.5rem;\n    }\n  }\n}\n\n.fba-modal-dialog .usa-date-picker__calendar__previous-month:not([disabled]){\n  background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/navigate_before.svg\"), linear-gradient(transparent, transparent);\n  background-repeat:no-repeat;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-date-picker__calendar__previous-month:not([disabled]){\n    background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/navigate_before.svg\");\n    background-repeat:no-repeat;\n    background-position:center center;\n    background-size:2.5rem 2.5rem;\n    display:inline-block;\n    height:2.5rem;\n    width:3rem;\n    background-color:buttonText;\n  }\n  @supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n    .fba-modal-dialog .usa-date-picker__calendar__previous-month:not([disabled]){\n      background:none;\n      background-color:ButtonText;\n      -webkit-mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/navigate_before.svg\"), linear-gradient(transparent, transparent);\n              mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/navigate_before.svg\"), linear-gradient(transparent, transparent);\n      -webkit-mask-position:center center;\n              mask-position:center center;\n      -webkit-mask-repeat:no-repeat;\n              mask-repeat:no-repeat;\n      -webkit-mask-size:2.5rem 2.5rem;\n              mask-size:2.5rem 2.5rem;\n    }\n  }\n}\n\n.fba-modal-dialog .usa-date-picker__calendar__next-year:not([disabled]){\n  background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/navigate_far_next.svg\"), linear-gradient(transparent, transparent);\n  background-repeat:no-repeat;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-date-picker__calendar__next-year:not([disabled]){\n    background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/navigate_far_next.svg\");\n    background-repeat:no-repeat;\n    background-position:center center;\n    background-size:2.5rem 2.5rem;\n    display:inline-block;\n    height:2.5rem;\n    width:3rem;\n    background-color:buttonText;\n  }\n  @supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n    .fba-modal-dialog .usa-date-picker__calendar__next-year:not([disabled]){\n      background:none;\n      background-color:ButtonText;\n      -webkit-mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/navigate_far_next.svg\"), linear-gradient(transparent, transparent);\n              mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/navigate_far_next.svg\"), linear-gradient(transparent, transparent);\n      -webkit-mask-position:center center;\n              mask-position:center center;\n      -webkit-mask-repeat:no-repeat;\n              mask-repeat:no-repeat;\n      -webkit-mask-size:2.5rem 2.5rem;\n              mask-size:2.5rem 2.5rem;\n    }\n  }\n}\n\n.fba-modal-dialog .usa-date-picker__calendar__next-month:not([disabled]){\n  background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/navigate_next.svg\"), linear-gradient(transparent, transparent);\n  background-repeat:no-repeat;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-date-picker__calendar__next-month:not([disabled]){\n    background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/navigate_next.svg\");\n    background-repeat:no-repeat;\n    background-position:center center;\n    background-size:2.5rem 2.5rem;\n    display:inline-block;\n    height:2.5rem;\n    width:3rem;\n    background-color:buttonText;\n  }\n  @supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n    .fba-modal-dialog .usa-date-picker__calendar__next-month:not([disabled]){\n      background:none;\n      background-color:ButtonText;\n      -webkit-mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/navigate_next.svg\"), linear-gradient(transparent, transparent);\n              mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/navigate_next.svg\"), linear-gradient(transparent, transparent);\n      -webkit-mask-position:center center;\n              mask-position:center center;\n      -webkit-mask-repeat:no-repeat;\n              mask-repeat:no-repeat;\n      -webkit-mask-size:2.5rem 2.5rem;\n              mask-size:2.5rem 2.5rem;\n    }\n  }\n}\n\n.fba-modal-dialog .usa-date-picker__calendar__day-of-week{\n  padding:6px 0px;\n}\n\n.fba-modal-dialog .usa-date-picker__calendar__date{\n  padding:10px 0px;\n}\n.fba-modal-dialog .usa-date-picker__calendar__date--focused{\n  outline:2px solid #162e51;\n  outline-offset:-2px;\n  position:relative;\n  z-index:100;\n}\n.fba-modal-dialog .usa-date-picker__calendar__date--next-month:not([disabled]), .fba-modal-dialog .usa-date-picker__calendar__date--previous-month:not([disabled]){\n  color:#5d5d52;\n}\n.fba-modal-dialog .usa-date-picker__calendar__date--selected, .fba-modal-dialog .usa-date-picker__calendar__date--range-date{\n  background-color:#0050d8;\n  color:#f9f9f9;\n}\n.fba-modal-dialog .usa-date-picker__calendar__date--selected:not([disabled]), .fba-modal-dialog .usa-date-picker__calendar__date--range-date:not([disabled]){\n  background-color:#0050d8;\n  color:#f9f9f9;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-date-picker__calendar__date--selected:not([disabled]), .fba-modal-dialog .usa-date-picker__calendar__date--range-date:not([disabled]){\n    border:ActiveText 2px solid;\n  }\n}\n.fba-modal-dialog .usa-date-picker__calendar__date--selected:not([disabled]):hover, .fba-modal-dialog .usa-date-picker__calendar__date--range-date:not([disabled]):hover{\n  background-color:#0050d8;\n  color:#e6e6e6;\n}\n.fba-modal-dialog .usa-date-picker__calendar__date--selected:not([disabled]):focus, .fba-modal-dialog .usa-date-picker__calendar__date--range-date:not([disabled]):focus{\n  background-color:#0050d8;\n  color:#f9f9f9;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-date-picker__calendar__date--selected:not([disabled]):focus, .fba-modal-dialog .usa-date-picker__calendar__date--range-date:not([disabled]):focus{\n    border:ActiveText 2px solid;\n  }\n}\n.fba-modal-dialog .usa-date-picker__calendar__date--selected:not([disabled]):active, .fba-modal-dialog .usa-date-picker__calendar__date--range-date:not([disabled]):active{\n  background-color:#1a4480;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-date-picker__calendar__date--selected:not([disabled]):active, .fba-modal-dialog .usa-date-picker__calendar__date--range-date:not([disabled]):active{\n    background-color:Highlight;\n  }\n}\n.fba-modal-dialog .usa-date-picker__calendar__date--range-date-start{\n  border-top-left-radius:10%;\n  border-bottom-left-radius:10%;\n}\n.fba-modal-dialog .usa-date-picker__calendar__date--range-date-end{\n  border-top-right-radius:10%;\n  border-bottom-right-radius:10%;\n}\n.fba-modal-dialog .usa-date-picker__calendar__date--within-range{\n  background-color:#cfe8ff;\n}\n.fba-modal-dialog .usa-date-picker__calendar__date--within-range:not([disabled]){\n  background-color:#cfe8ff;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-date-picker__calendar__date--within-range:not([disabled]){\n    border:Highlight 2px solid;\n  }\n}\n.fba-modal-dialog .usa-date-picker__calendar__date--within-range:not([disabled]):hover{\n  background-color:#cfe8ff;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-date-picker__calendar__date--within-range:not([disabled]):hover{\n    border:Highlight 2px solid;\n  }\n}\n.fba-modal-dialog .usa-date-picker__calendar__date--within-range:not([disabled]):focus{\n  background-color:#cfe8ff;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-date-picker__calendar__date--within-range:not([disabled]):focus{\n    border:Highlight 2px solid;\n  }\n}\n.fba-modal-dialog .usa-date-picker__calendar__date--within-range:not([disabled]):active{\n  background-color:#cfe8ff;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-date-picker__calendar__date--within-range:not([disabled]):active{\n    background-color:Highlight;\n  }\n}\n\n@media all and (max-width: 19.99em){\n  .fba-modal-dialog .usa-date-picker__calendar__month-label{\n    min-width:100%;\n    order:-1;\n  }\n}\n@media all and (min-width: 20em){\n  .fba-modal-dialog .usa-date-picker__calendar__month-label{\n    flex:4;\n    text-align:center;\n  }\n}\n\n.fba-modal-dialog .usa-date-picker__calendar__year-selection,\n.fba-modal-dialog .usa-date-picker__calendar__month-selection{\n  display:inline-block;\n  height:100%;\n  padding:8px 4px;\n  width:auto;\n}\n@media all and (max-width: 19.99em){\n  .fba-modal-dialog .usa-date-picker__calendar__year-selection,\n  .fba-modal-dialog .usa-date-picker__calendar__month-selection{\n    padding-bottom:0;\n    padding-top:12px;\n  }\n}\n\n.fba-modal-dialog .usa-date-picker__calendar__month-picker{\n  padding:20px 5px;\n}\n@media all and (max-width: 19.99em){\n  .fba-modal-dialog .usa-date-picker__calendar__month-picker{\n    padding-bottom:12px;\n    padding-top:12px;\n  }\n  .fba-modal-dialog .usa-date-picker__calendar__month-picker tr{\n    display:flex;\n    flex-direction:column;\n  }\n}\n\n.fba-modal-dialog .usa-date-picker__calendar__month{\n  padding:10px 0;\n}\n.fba-modal-dialog .usa-date-picker__calendar__month--focused{\n  outline:2px solid #162e51;\n  outline-offset:-2px;\n  position:relative;\n  z-index:100;\n}\n.fba-modal-dialog .usa-date-picker__calendar__month--selected{\n  background-color:#0050d8;\n  color:#f9f9f9;\n}\n.fba-modal-dialog .usa-date-picker__calendar__month--selected:not([disabled]){\n  background-color:#0050d8;\n  color:#f9f9f9;\n}\n.fba-modal-dialog .usa-date-picker__calendar__month--selected:not([disabled]):hover{\n  background-color:#0050d8;\n  color:#e6e6e6;\n}\n.fba-modal-dialog .usa-date-picker__calendar__month--selected:not([disabled]):focus{\n  background-color:#0050d8;\n  color:#f9f9f9;\n}\n.fba-modal-dialog .usa-date-picker__calendar__month--selected:not([disabled]):active{\n  background-color:#1a4480;\n}\n\n.fba-modal-dialog .usa-date-picker__calendar__year-picker{\n  padding:20px 5px;\n}\n\n.fba-modal-dialog .usa-date-picker__calendar__previous-year-chunk,\n.fba-modal-dialog .usa-date-picker__calendar__next-year-chunk{\n  background-position:center;\n  background-size:auto 2rem;\n  margin:auto;\n  padding:40px 0;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-date-picker__calendar__previous-year-chunk,\n  .fba-modal-dialog .usa-date-picker__calendar__next-year-chunk{\n    -webkit-mask-size:1.5rem !important;\n            mask-size:1.5rem !important;\n  }\n}\n\n.fba-modal-dialog .usa-date-picker__calendar__previous-year-chunk:not([disabled]){\n  background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/navigate_before.svg\"), linear-gradient(transparent, transparent);\n  background-repeat:no-repeat;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-date-picker__calendar__previous-year-chunk:not([disabled]){\n    background-image:none;\n  }\n  .fba-modal-dialog .usa-date-picker__calendar__previous-year-chunk:not([disabled])::after{\n    background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/navigate_before.svg\");\n    background-repeat:no-repeat;\n    background-position:center center;\n    background-size:2.5rem 2.5rem;\n    display:inline-block;\n    height:2.5rem;\n    width:3rem;\n    content:\"\";\n    vertical-align:middle;\n    margin-left:auto;\n  }\n  @supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n    .fba-modal-dialog .usa-date-picker__calendar__previous-year-chunk:not([disabled])::after{\n      background:none;\n      background-color:ButtonText;\n      -webkit-mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/navigate_before.svg\"), linear-gradient(transparent, transparent);\n              mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/navigate_before.svg\"), linear-gradient(transparent, transparent);\n      -webkit-mask-position:center center;\n              mask-position:center center;\n      -webkit-mask-repeat:no-repeat;\n              mask-repeat:no-repeat;\n      -webkit-mask-size:2.5rem 2.5rem;\n              mask-size:2.5rem 2.5rem;\n    }\n  }\n  .fba-modal-dialog .usa-date-picker__calendar__previous-year-chunk:not([disabled]):hover{\n    border:2px solid transparent;\n    background-color:transparent;\n  }\n}\n\n.fba-modal-dialog .usa-date-picker__calendar__next-year-chunk:not([disabled]){\n  background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/navigate_next.svg\"), linear-gradient(transparent, transparent);\n  background-repeat:no-repeat;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-date-picker__calendar__next-year-chunk:not([disabled]){\n    background-image:none;\n  }\n  .fba-modal-dialog .usa-date-picker__calendar__next-year-chunk:not([disabled])::after{\n    background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/navigate_next.svg\");\n    background-repeat:no-repeat;\n    background-position:center center;\n    background-size:2.5rem 2.5rem;\n    display:inline-block;\n    height:2.5rem;\n    width:3rem;\n    content:\"\";\n    vertical-align:middle;\n    margin-left:auto;\n  }\n  @supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n    .fba-modal-dialog .usa-date-picker__calendar__next-year-chunk:not([disabled])::after{\n      background:none;\n      background-color:ButtonText;\n      -webkit-mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/navigate_next.svg\"), linear-gradient(transparent, transparent);\n              mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/navigate_next.svg\"), linear-gradient(transparent, transparent);\n      -webkit-mask-position:center center;\n              mask-position:center center;\n      -webkit-mask-repeat:no-repeat;\n              mask-repeat:no-repeat;\n      -webkit-mask-size:2.5rem 2.5rem;\n              mask-size:2.5rem 2.5rem;\n    }\n  }\n  .fba-modal-dialog .usa-date-picker__calendar__next-year-chunk:not([disabled]):hover{\n    border:2px solid transparent;\n    background-color:transparent;\n  }\n}\n\n.fba-modal-dialog .usa-date-picker__calendar__year{\n  padding:10px 0;\n}\n.fba-modal-dialog .usa-date-picker__calendar__year--focused{\n  outline:2px solid #162e51;\n  outline-offset:-2px;\n  position:relative;\n  z-index:100;\n}\n.fba-modal-dialog .usa-date-picker__calendar__year--selected{\n  background-color:#0050d8;\n  color:#f9f9f9;\n}\n.fba-modal-dialog .usa-date-picker__calendar__year--selected:not([disabled]){\n  background-color:#0050d8;\n  color:#f9f9f9;\n}\n.fba-modal-dialog .usa-date-picker__calendar__year--selected:not([disabled]):hover{\n  background-color:#0050d8;\n  color:#e6e6e6;\n}\n.fba-modal-dialog .usa-date-picker__calendar__year--selected:not([disabled]):focus{\n  background-color:#0050d8;\n  color:#f9f9f9;\n}\n.fba-modal-dialog .usa-date-picker__calendar__year--selected:not([disabled]):active{\n  background-color:#1a4480;\n}\n.fba-modal-dialog .usa-embed-container iframe,\n.fba-modal-dialog .usa-embed-container object,\n.fba-modal-dialog .usa-embed-container embed{\n  position:absolute;\n  top:0;\n  left:0;\n  width:100%;\n  height:100%;\n}\n\n.fba-modal-dialog .usa-embed-container{\n  box-sizing:border-box;\n  height:0;\n  overflow:hidden;\n  padding-bottom:56.25%;\n  position:relative;\n  max-width:100%;\n}\n@supports (aspect-ratio: 1){\n  .fba-modal-dialog .usa-embed-container{\n    height:inherit;\n    padding:inherit;\n    aspect-ratio:1.7777777778;\n    max-width:100%;\n  }\n  .fba-modal-dialog .usa-embed-container > *{\n    position:absolute;\n    top:0;\n    left:0;\n    width:100%;\n    height:100%;\n  }\n  .fba-modal-dialog img.usa-embed-container, .fba-modal-dialog .usa-embed-container > img{\n    -o-object-fit:cover;\n       object-fit:cover;\n  }\n}\n\n.fba-modal-dialog .grid-row{\n  display:flex;\n  flex-wrap:wrap;\n}\n.fba-modal-dialog .grid-row.grid-gap-1{\n  margin-left:-0.25rem;\n  margin-right:-0.25rem;\n}\n.fba-modal-dialog .grid-row.grid-gap-1 > *{\n  padding-left:0.25rem;\n  padding-right:0.25rem;\n}\n.fba-modal-dialog .grid-row.grid-gap-2{\n  margin-left:-0.5rem;\n  margin-right:-0.5rem;\n}\n.fba-modal-dialog .grid-row.grid-gap-2 > *{\n  padding-left:0.5rem;\n  padding-right:0.5rem;\n}\n.fba-modal-dialog .grid-row.grid-gap-4{\n  margin-left:-1rem;\n  margin-right:-1rem;\n}\n.fba-modal-dialog .grid-row.grid-gap-4 > *{\n  padding-left:1rem;\n  padding-right:1rem;\n}\n@media all and (min-width: 30em){\n  .fba-modal-dialog .grid-row.mobile-lg\\:grid-gap-2{\n    margin-left:-0.5rem;\n    margin-right:-0.5rem;\n  }\n  .fba-modal-dialog .grid-row.mobile-lg\\:grid-gap-2 > *{\n    padding-left:0.5rem;\n    padding-right:0.5rem;\n  }\n}\n\n.fba-modal-dialog .grid-gap{\n  margin-left:-0.5rem;\n  margin-right:-0.5rem;\n}\n.fba-modal-dialog .grid-gap > *{\n  padding-left:0.5rem;\n  padding-right:0.5rem;\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .grid-gap{\n    margin-left:-1rem;\n    margin-right:-1rem;\n  }\n  .fba-modal-dialog .grid-gap > *{\n    padding-left:1rem;\n    padding-right:1rem;\n  }\n}\n\n.fba-modal-dialog [class*=grid-col]{\n  position:relative;\n  width:100%;\n  box-sizing:border-box;\n}\n\n.fba-modal-dialog .grid-col-auto{\n  flex:0 1 auto;\n  width:auto;\n  max-width:100%;\n}\n@media all and (min-width: 30em){\n  .fba-modal-dialog .mobile-lg\\:grid-col-auto{\n    flex:0 1 auto;\n    width:auto;\n    max-width:100%;\n  }\n  .fba-modal-dialog .mobile-lg\\:grid-col-4{\n    flex:0 1 auto;\n    width:33.3333333333%;\n  }\n  .fba-modal-dialog .mobile-lg\\:grid-col-6{\n    flex:0 1 auto;\n    width:50%;\n  }\n  .fba-modal-dialog .mobile-lg\\:grid-col-8{\n    flex:0 1 auto;\n    width:66.6666666667%;\n  }\n  .fba-modal-dialog .mobile-lg\\:grid-col-12{\n    flex:0 1 auto;\n    width:100%;\n  }\n}\n@media all and (min-width: 40em){\n  .fba-modal-dialog .tablet\\:grid-col-4{\n    flex:0 1 auto;\n    width:33.3333333333%;\n  }\n  .fba-modal-dialog .tablet\\:grid-col-8{\n    flex:0 1 auto;\n    width:66.6666666667%;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .desktop\\:grid-col-auto{\n    flex:0 1 auto;\n    width:auto;\n    max-width:100%;\n  }\n  .fba-modal-dialog .desktop\\:grid-col-3{\n    flex:0 1 auto;\n    width:25%;\n  }\n}\n.fba-modal-dialog .usa-footer{\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:1.06rem;\n  line-height:1.5;\n  overflow:hidden;\n}\n.fba-modal-dialog .usa-footer > .grid-container{\n  margin-left:auto;\n  margin-right:auto;\n  max-width:64rem;\n  padding-left:1rem;\n  padding-right:1rem;\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-footer > .grid-container{\n    padding-left:2rem;\n    padding-right:2rem;\n  }\n}\n\n.fba-modal-dialog .usa-footer__return-to-top{\n  padding-bottom:1.25rem;\n  padding-top:1.25rem;\n  line-height:0.9;\n}\n.fba-modal-dialog .usa-footer__return-to-top a{\n  color:#005ea2;\n  text-decoration:underline;\n}\n.fba-modal-dialog .usa-footer__return-to-top a:visited{\n  color:#54278f;\n}\n.fba-modal-dialog .usa-footer__return-to-top a:hover{\n  color:#1a4480;\n}\n.fba-modal-dialog .usa-footer__return-to-top a:active{\n  color:#162e51;\n}\n.fba-modal-dialog .usa-footer__return-to-top a:focus{\n  outline:0.25rem solid #2491ff;\n  outline-offset:0rem;\n}\n\n.fba-modal-dialog .usa-footer__nav{\n  margin-left:auto;\n  margin-right:auto;\n  max-width:64rem;\n  padding-left:1rem;\n  padding-right:1rem;\n  padding-left:0;\n  padding-right:0;\n  border-bottom:1px solid #a9aeb1;\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-footer__nav{\n    padding-left:2rem;\n    padding-right:2rem;\n  }\n}\n@media all and (min-width: 30em){\n  .fba-modal-dialog .usa-footer__nav{\n    padding-left:1rem;\n    padding-right:1rem;\n    border-bottom:none;\n  }\n}\n@media all and (min-width: 30em) and (min-width: 64em){\n  .fba-modal-dialog .usa-footer__nav{\n    padding-left:2rem;\n    padding-right:2rem;\n  }\n}\n.fba-modal-dialog .usa-footer__nav > ul{\n  margin-bottom:0;\n  margin-top:0;\n  list-style-type:none;\n  padding-left:0;\n}\n\n.fba-modal-dialog .usa-footer__primary-section{\n  background-color:#f0f0f0;\n}\n.fba-modal-dialog .usa-footer__primary-section > .grid-container{\n  margin-left:auto;\n  margin-right:auto;\n  max-width:64rem;\n  padding-left:1rem;\n  padding-right:1rem;\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-footer__primary-section > .grid-container{\n    padding-left:2rem;\n    padding-right:2rem;\n  }\n}\n\n.fba-modal-dialog .usa-footer__primary-container{\n  margin-left:auto;\n  margin-right:auto;\n  max-width:64rem;\n  padding-left:1rem;\n  padding-right:1rem;\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-footer__primary-container{\n    padding-left:2rem;\n    padding-right:2rem;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-footer__primary-container{\n    padding-left:2rem;\n    padding-right:2rem;\n  }\n}\n\n.fba-modal-dialog .usa-footer__primary-content{\n  line-height:1.1;\n}\n\n.fba-modal-dialog .usa-footer__primary-link{\n  padding-left:1rem;\n  padding-right:1rem;\n  padding-bottom:1rem;\n  padding-top:1rem;\n  color:#1b1b1b;\n  font-weight:700;\n  display:block;\n}\n@media all and (min-width: 30em){\n  .fba-modal-dialog .usa-footer__primary-link{\n    padding-left:0;\n    padding-right:0;\n  }\n}\n.fba-modal-dialog .usa-footer__primary-link--button{\n  width:100%;\n  border:0;\n  cursor:pointer;\n}\n.fba-modal-dialog .usa-footer__primary-link--button::before{\n  background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/expand_more.svg\");\n  background-repeat:no-repeat;\n  background-position:center center;\n  background-size:1.25rem 1.25rem;\n  display:inline-block;\n  height:1.25rem;\n  width:1.25rem;\n  content:\"\";\n  vertical-align:middle;\n  margin-right:0.25rem;\n}\n@supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n  .fba-modal-dialog .usa-footer__primary-link--button::before{\n    background:none;\n    background-color:currentColor;\n    -webkit-mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/expand_more.svg\"), linear-gradient(transparent, transparent);\n            mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/expand_more.svg\"), linear-gradient(transparent, transparent);\n    -webkit-mask-position:center center;\n            mask-position:center center;\n    -webkit-mask-repeat:no-repeat;\n            mask-repeat:no-repeat;\n    -webkit-mask-size:1.25rem 1.25rem;\n            mask-size:1.25rem 1.25rem;\n  }\n}\n.fba-modal-dialog .usa-footer__primary-link--button:not([disabled]):focus{\n  outline:0.25rem solid #2491ff;\n  outline-offset:-0.25rem;\n}\n.fba-modal-dialog .usa-footer__primary-link--button::before{\n  height:1.25rem;\n  width:1.25rem;\n  align-items:center;\n  background-size:contain;\n  content:\"\";\n  display:inline-flex;\n  justify-content:center;\n  margin-right:0.25rem;\n  margin-left:-0.25rem;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-footer__primary-link--button::before{\n    background-color:buttonText !important;\n  }\n}\n.fba-modal-dialog .usa-footer__primary-link--button + .usa-list--unstyled{\n  margin-top:0.5rem;\n  margin-bottom:0.5rem;\n}\n.fba-modal-dialog .usa-footer__primary-link--button[aria-expanded=false]::before{\n  background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/navigate_next.svg\");\n  background-repeat:no-repeat;\n  background-position:center center;\n  background-size:1.25rem 1.25rem;\n  display:inline-block;\n  height:1.25rem;\n  width:1.25rem;\n  content:\"\";\n  vertical-align:middle;\n  margin-right:0.25rem;\n}\n@supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n  .fba-modal-dialog .usa-footer__primary-link--button[aria-expanded=false]::before{\n    background:none;\n    background-color:currentColor;\n    -webkit-mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/navigate_next.svg\"), linear-gradient(transparent, transparent);\n            mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/navigate_next.svg\"), linear-gradient(transparent, transparent);\n    -webkit-mask-position:center center;\n            mask-position:center center;\n    -webkit-mask-repeat:no-repeat;\n            mask-repeat:no-repeat;\n    -webkit-mask-size:1.25rem 1.25rem;\n            mask-size:1.25rem 1.25rem;\n  }\n}\n.fba-modal-dialog .usa-footer__primary-link--button[aria-expanded=false] + .usa-list--unstyled{\n  display:none;\n}\n\n.fba-modal-dialog .usa-footer__secondary-link{\n  line-height:1.1;\n  margin-left:1rem;\n  padding:0;\n}\n.fba-modal-dialog .usa-footer__secondary-link a{\n  color:#005ea2;\n  text-decoration:underline;\n}\n.fba-modal-dialog .usa-footer__secondary-link a:visited{\n  color:#54278f;\n}\n.fba-modal-dialog .usa-footer__secondary-link a:hover{\n  color:#1a4480;\n}\n.fba-modal-dialog .usa-footer__secondary-link a:active{\n  color:#162e51;\n}\n.fba-modal-dialog .usa-footer__secondary-link a:focus{\n  outline:0.25rem solid #2491ff;\n  outline-offset:0rem;\n}\n.fba-modal-dialog .usa-footer__secondary-link + .usa-footer__secondary-link{\n  padding-top:1rem;\n}\n@media all and (min-width: 30em){\n  .fba-modal-dialog .usa-footer__secondary-link{\n    margin-left:0;\n  }\n}\n\n.fba-modal-dialog .usa-footer__contact-info{\n  line-height:1.1;\n}\n.fba-modal-dialog .usa-footer__contact-info a{\n  color:#1b1b1b;\n}\n@media all and (min-width: 30em){\n  .fba-modal-dialog .usa-footer__contact-info{\n    justify-content:flex-end;\n    margin-top:0.5rem;\n  }\n}\n\n.fba-modal-dialog .usa-footer__primary-content{\n  border-top:1px solid #a9aeb1;\n}\n@media all and (min-width: 30em){\n  .fba-modal-dialog .usa-footer__primary-content{\n    border:none;\n  }\n}\n\n.fba-modal-dialog .usa-sign-up{\n  padding-bottom:2rem;\n  padding-top:1.5rem;\n}\n.fba-modal-dialog .usa-sign-up .usa-label,\n.fba-modal-dialog .usa-sign-up .usa-button{\n  margin-top:0.75rem;\n}\n\n.fba-modal-dialog .usa-sign-up__heading{\n  font-family:Merriweather Web, Georgia, Cambria, Times New Roman, Times, serif;\n  font-size:1.34rem;\n  line-height:1.2;\n  font-weight:700;\n  margin:0;\n}\n\n.fba-modal-dialog .usa-footer__secondary-section{\n  padding-bottom:1.25rem;\n  padding-top:1.25rem;\n  color:#1b1b1b;\n  background-color:#dfe1e2;\n}\n.fba-modal-dialog .usa-footer__secondary-section > .grid-container{\n  margin-left:auto;\n  margin-right:auto;\n  max-width:64rem;\n  padding-left:1rem;\n  padding-right:1rem;\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-footer__secondary-section > .grid-container{\n    padding-left:2rem;\n    padding-right:2rem;\n  }\n}\n.fba-modal-dialog .usa-footer__secondary-section > .grid-container > .grid-row{\n  justify-content:space-between;\n}\n.fba-modal-dialog .usa-footer__secondary-section a{\n  color:#1b1b1b;\n}\n\n.fba-modal-dialog .usa-footer__logo{\n  margin-bottom:0.5rem;\n  margin-top:0.5rem;\n}\n@media all and (min-width: 30em){\n  .fba-modal-dialog .usa-footer__logo{\n    margin-bottom:0;\n    margin-top:0;\n    align-items:center;\n  }\n}\n\n.fba-modal-dialog .usa-footer__logo-img{\n  max-width:5rem;\n}\n\n.fba-modal-dialog .usa-footer__logo-heading{\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:1.46rem;\n  line-height:0.9;\n  font-weight:700;\n  margin-bottom:0.5rem;\n  margin-top:0.5rem;\n}\n\n.fba-modal-dialog .usa-footer__contact-links{\n  margin-top:1.5rem;\n}\n@media all and (min-width: 30em){\n  .fba-modal-dialog .usa-footer__contact-links{\n    margin-top:0;\n    text-align:right;\n  }\n}\n\n.fba-modal-dialog .usa-footer__contact-heading{\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:1.46rem;\n  line-height:1.1;\n  font-weight:700;\n  margin-top:0;\n}\n@media all and (min-width: 30em){\n  .fba-modal-dialog .usa-footer__contact-heading{\n    margin-bottom:0.25rem;\n    margin-top:0.25rem;\n  }\n}\n\n.fba-modal-dialog .usa-footer__social-links{\n  line-height:0.9;\n  padding-bottom:0.5rem;\n}\n.fba-modal-dialog .usa-footer__social-links a{\n  text-decoration:none;\n}\n@media all and (min-width: 30em){\n  .fba-modal-dialog .usa-footer__social-links{\n    justify-content:flex-end;\n  }\n}\n\n.fba-modal-dialog .usa-social-link{\n  height:3rem;\n  width:3rem;\n  background-color:rgba(0, 0, 0, 0.1);\n  display:inline-block;\n  padding:0.25rem;\n}\n.fba-modal-dialog .usa-social-link:hover{\n  background-color:white;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-social-link{\n    background-color:lightgrey;\n    forced-color-adjust:none;\n  }\n}\n\n.fba-modal-dialog .usa-social-link__icon{\n  display:block;\n  height:auto;\n  width:100%;\n}\n\n@media all and (min-width: 30em){\n  .fba-modal-dialog .usa-footer__address{\n    justify-content:flex-end;\n  }\n}\n\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-footer--slim .usa-footer__nav{\n    padding-left:0;\n    padding-right:0;\n  }\n}\n.fba-modal-dialog .usa-footer--slim .usa-footer__address{\n  padding-left:1rem;\n  padding-right:1rem;\n  padding-bottom:1rem;\n  padding-top:1rem;\n}\n@media all and (min-width: 30em){\n  .fba-modal-dialog .usa-footer--slim .usa-footer__address{\n    padding:0;\n  }\n}\n.fba-modal-dialog .usa-footer--slim .usa-footer__logo{\n  align-items:center;\n}\n.fba-modal-dialog .usa-footer--slim .usa-footer__logo-img{\n  max-width:3rem;\n}\n.fba-modal-dialog .usa-footer--slim .usa-footer__contact-info{\n  display:inline-block;\n}\n@media all and (min-width: 30em){\n  .fba-modal-dialog .usa-footer--slim .usa-footer__contact-info{\n    padding-bottom:1rem;\n    padding-top:1rem;\n    margin-top:0;\n  }\n}\n\n.fba-modal-dialog .usa-footer--big .usa-footer__nav{\n  margin-left:-1rem;\n  margin-right:-1rem;\n}\n@media all and (min-width: 30em){\n  .fba-modal-dialog .usa-footer--big .usa-footer__nav{\n    border-bottom:1px solid #a9aeb1;\n    padding-top:2rem;\n  }\n}\n@media all and (min-width: 40em){\n  .fba-modal-dialog .usa-footer--big .usa-footer__nav{\n    margin-left:0;\n    margin-right:0;\n    padding-left:0;\n    padding-right:0;\n    border-bottom:none;\n  }\n}\n.fba-modal-dialog .usa-footer--big .usa-footer__primary-link{\n  font-family:Merriweather Web, Georgia, Cambria, Times New Roman, Times, serif;\n  font-size:0.98rem;\n  line-height:1.2;\n  font-weight:700;\n  line-height:1.2;\n  margin:0;\n}\n@media all and (min-width: 30em){\n  .fba-modal-dialog .usa-footer--big .usa-footer__primary-link{\n    padding-bottom:0;\n    padding-top:0;\n    margin-bottom:0.5rem;\n  }\n  .fba-modal-dialog .usa-footer--big .usa-footer__primary-link:hover{\n    cursor:auto;\n    text-decoration:none;\n  }\n}\n.fba-modal-dialog .usa-footer--big .usa-footer__primary-content--collapsible .usa-footer__primary-link{\n  align-items:center;\n  display:flex;\n  justify-content:flex-start;\n}\n.fba-modal-dialog .usa-footer--big .usa-footer__primary-content--collapsible .usa-list--unstyled{\n  padding-left:1rem;\n  padding-right:1rem;\n  padding-bottom:1.25rem;\n}\n@media all and (min-width: 30em){\n  .fba-modal-dialog .usa-footer--big .usa-footer__primary-content--collapsible .usa-list--unstyled{\n    padding-left:0;\n    padding-right:0;\n    padding-bottom:2rem;\n    padding-top:0.75rem;\n  }\n}\n\n.fba-modal-dialog .usa-form{\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:1.06rem;\n  line-height:1.3;\n}\n@media all and (min-width: 30em){\n  .fba-modal-dialog .usa-form{\n    max-width:20rem;\n  }\n}\n.fba-modal-dialog .usa-form abbr[title=required]{\n  text-decoration:none;\n}\n.fba-modal-dialog .usa-form .usa-input,\n.fba-modal-dialog .usa-form .usa-range,\n.fba-modal-dialog .usa-form .usa-select,\n.fba-modal-dialog .usa-form .usa-textarea{\n  max-width:none;\n}\n.fba-modal-dialog .usa-form .usa-input--2xs,\n.fba-modal-dialog .usa-form .usa-input-group--2xs{\n  max-width:5ex;\n}\n.fba-modal-dialog .usa-form .usa-input--xs,\n.fba-modal-dialog .usa-form .usa-input-group--xs{\n  max-width:9ex;\n}\n.fba-modal-dialog .usa-form .usa-input--sm, .fba-modal-dialog .usa-form .usa-input--small, .fba-modal-dialog .usa-form .usa-input-group--sm, .fba-modal-dialog .usa-form .usa-input-group--small{\n  max-width:13ex;\n}\n.fba-modal-dialog .usa-form .usa-input--md, .fba-modal-dialog .usa-form .usa-input--medium, .fba-modal-dialog .usa-form .usa-input-group--md, .fba-modal-dialog .usa-form .usa-input-group--medium{\n  max-width:20ex;\n}\n.fba-modal-dialog .usa-form .usa-input--lg,\n.fba-modal-dialog .usa-form .usa-input-group--lg{\n  max-width:30ex;\n}\n.fba-modal-dialog .usa-form .usa-input--xl,\n.fba-modal-dialog .usa-form .usa-input-group--xl{\n  max-width:40ex;\n}\n.fba-modal-dialog .usa-form .usa-input--2xl,\n.fba-modal-dialog .usa-form .usa-input-group--2xl{\n  max-width:50ex;\n}\n.fba-modal-dialog .usa-form .usa-button{\n  margin-top:0.5rem;\n}\n@media all and (min-width: 30em){\n  .fba-modal-dialog .usa-form .usa-button{\n    margin-top:1.5rem;\n  }\n}\n.fba-modal-dialog .usa-form a:where(:not(.usa-button)){\n  color:#005ea2;\n  text-decoration:underline;\n}\n.fba-modal-dialog .usa-form a:where(:not(.usa-button)):visited{\n  color:#54278f;\n}\n.fba-modal-dialog .usa-form a:where(:not(.usa-button)):hover{\n  color:#1a4480;\n}\n.fba-modal-dialog .usa-form a:where(:not(.usa-button)):active{\n  color:#162e51;\n}\n.fba-modal-dialog .usa-form a:where(:not(.usa-button)):focus{\n  outline:0.25rem solid #2491ff;\n  outline-offset:0rem;\n}\n\n@media all and (min-width: 30em){\n  .fba-modal-dialog .usa-form--large{\n    max-width:30rem;\n  }\n}\n\n.fba-modal-dialog .usa-show-password{\n  color:#005ea2;\n  text-decoration:underline;\n  background-color:transparent;\n  border:0;\n  border-radius:0;\n  box-shadow:none;\n  font-weight:normal;\n  justify-content:normal;\n  text-align:left;\n  margin:0;\n  padding:0;\n  cursor:pointer;\n}\n.fba-modal-dialog .usa-show-password:visited{\n  color:#54278f;\n}\n.fba-modal-dialog .usa-show-password:hover{\n  color:#1a4480;\n}\n.fba-modal-dialog .usa-show-password:active{\n  color:#162e51;\n}\n.fba-modal-dialog .usa-show-password:focus{\n  outline:0.25rem solid #2491ff;\n  outline-offset:0rem;\n}\n.fba-modal-dialog .usa-show-password:hover, .fba-modal-dialog .usa-show-password.usa-button--hover, .fba-modal-dialog .usa-show-password:disabled:hover, .fba-modal-dialog .usa-show-password[aria-disabled=true]:hover, .fba-modal-dialog .usa-show-password:disabled.usa-button--hover, .fba-modal-dialog .usa-show-password[aria-disabled=true].usa-button--hover, .fba-modal-dialog .usa-show-password:active, .fba-modal-dialog .usa-show-password.usa-button--active, .fba-modal-dialog .usa-show-password:disabled:active, .fba-modal-dialog .usa-show-password[aria-disabled=true]:active, .fba-modal-dialog .usa-show-password:disabled.usa-button--active, .fba-modal-dialog .usa-show-password[aria-disabled=true].usa-button--active, .fba-modal-dialog .usa-show-password:disabled:focus, .fba-modal-dialog .usa-show-password[aria-disabled=true]:focus, .fba-modal-dialog .usa-show-password:disabled.usa-focus, .fba-modal-dialog .usa-show-password[aria-disabled=true].usa-focus, .fba-modal-dialog .usa-show-password:disabled, .fba-modal-dialog .usa-show-password[aria-disabled=true], .fba-modal-dialog .usa-show-password.usa-button--disabled{\n  background-color:transparent;\n  box-shadow:none;\n  text-decoration:underline;\n}\n.fba-modal-dialog .usa-show-password.usa-button--hover{\n  color:#1a4480;\n}\n.fba-modal-dialog .usa-show-password.usa-button--active{\n  color:#162e51;\n}\n.fba-modal-dialog .usa-show-password:disabled, .fba-modal-dialog .usa-show-password[aria-disabled=true], .fba-modal-dialog .usa-show-password:disabled:hover, .fba-modal-dialog .usa-show-password[aria-disabled=true]:hover, .fba-modal-dialog .usa-show-password[aria-disabled=true]:focus{\n  color:#757575;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-show-password:disabled, .fba-modal-dialog .usa-show-password[aria-disabled=true], .fba-modal-dialog .usa-show-password:disabled:hover, .fba-modal-dialog .usa-show-password[aria-disabled=true]:hover, .fba-modal-dialog .usa-show-password[aria-disabled=true]:focus{\n    color:GrayText;\n  }\n}\n\n.fba-modal-dialog .usa-form__note,\n.fba-modal-dialog .usa-show-password{\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:0.93rem;\n  line-height:1.3;\n  float:right;\n  margin:0.25rem 0 1rem;\n}\n\n.fba-modal-dialog .usa-form-group{\n  margin-top:1.5rem;\n}\n.fba-modal-dialog .usa-form-group .usa-label:first-child{\n  margin-top:0;\n}\n\n.fba-modal-dialog .usa-form-group--error{\n  border-left-width:0.25rem;\n  border-left-color:#b50909;\n  border-left-style:solid;\n  padding-left:1rem;\n  position:relative;\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-form-group--error{\n    margin-left:-1.25rem;\n  }\n}\n\n.fba-modal-dialog .usa-fieldset{\n  border:none;\n  margin:0;\n  padding:0;\n}\n\n.fba-modal-dialog .usa-header{\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:1.06rem;\n  line-height:1.5;\n}\n.fba-modal-dialog .usa-header::after{\n  clear:both;\n  content:\"\";\n  display:block;\n}\n.fba-modal-dialog .usa-header a{\n  border-bottom:none;\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-header .usa-search{\n    float:right;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-header [role=search]{\n    float:right;\n    max-width:calc(27ch + 3rem);\n    width:100%;\n  }\n}\n.fba-modal-dialog .usa-header [type=search]{\n  min-width:0;\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-header + .usa-hero{\n    border-top:1px solid white;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-header + .usa-section,\n  .fba-modal-dialog .usa-header + main{\n    border-top:1px solid #dfe1e2;\n  }\n}\n\n@media all and (max-width: 63.99em){\n  .fba-modal-dialog .usa-logo{\n    flex:1 1 0%;\n    font-size:0.93rem;\n    line-height:0.9;\n    margin-left:1rem;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-logo{\n    margin-top:2rem;\n    margin-bottom:1rem;\n    font-size:1.46rem;\n    line-height:1.1;\n  }\n}\n.fba-modal-dialog .usa-logo a{\n  color:#1b1b1b;\n  text-decoration:none;\n}\n\n.fba-modal-dialog .usa-logo__text{\n  display:block;\n  font-style:normal;\n  font-weight:700;\n  margin:0;\n}\n\n.fba-modal-dialog .usa-menu-btn{\n  color:#005ea2;\n  text-decoration:underline;\n  background-color:transparent;\n  border:0;\n  border-radius:0;\n  box-shadow:none;\n  font-weight:normal;\n  justify-content:normal;\n  text-align:left;\n  margin:0;\n  padding:0;\n  flex:0 1 auto;\n  padding-left:0.75rem;\n  padding-right:0.75rem;\n  background-color:#005ea2;\n  color:white;\n  font-size:0.87rem;\n  height:3rem;\n  text-align:center;\n  text-decoration:none;\n  text-transform:uppercase;\n}\n.fba-modal-dialog .usa-menu-btn:visited{\n  color:#54278f;\n}\n.fba-modal-dialog .usa-menu-btn:hover{\n  color:#1a4480;\n}\n.fba-modal-dialog .usa-menu-btn:active{\n  color:#162e51;\n}\n.fba-modal-dialog .usa-menu-btn:focus{\n  outline:0.25rem solid #2491ff;\n  outline-offset:0rem;\n}\n.fba-modal-dialog .usa-menu-btn:hover, .fba-modal-dialog .usa-menu-btn.usa-button--hover, .fba-modal-dialog .usa-menu-btn:disabled:hover, .fba-modal-dialog .usa-menu-btn[aria-disabled=true]:hover, .fba-modal-dialog .usa-menu-btn:disabled.usa-button--hover, .fba-modal-dialog .usa-menu-btn[aria-disabled=true].usa-button--hover, .fba-modal-dialog .usa-menu-btn:active, .fba-modal-dialog .usa-menu-btn.usa-button--active, .fba-modal-dialog .usa-menu-btn:disabled:active, .fba-modal-dialog .usa-menu-btn[aria-disabled=true]:active, .fba-modal-dialog .usa-menu-btn:disabled.usa-button--active, .fba-modal-dialog .usa-menu-btn[aria-disabled=true].usa-button--active, .fba-modal-dialog .usa-menu-btn:disabled:focus, .fba-modal-dialog .usa-menu-btn[aria-disabled=true]:focus, .fba-modal-dialog .usa-menu-btn:disabled.usa-focus, .fba-modal-dialog .usa-menu-btn[aria-disabled=true].usa-focus, .fba-modal-dialog .usa-menu-btn:disabled, .fba-modal-dialog .usa-menu-btn[aria-disabled=true], .fba-modal-dialog .usa-menu-btn.usa-button--disabled{\n  background-color:transparent;\n  box-shadow:none;\n  text-decoration:underline;\n}\n.fba-modal-dialog .usa-menu-btn.usa-button--hover{\n  color:#1a4480;\n}\n.fba-modal-dialog .usa-menu-btn.usa-button--active{\n  color:#162e51;\n}\n.fba-modal-dialog .usa-menu-btn:disabled, .fba-modal-dialog .usa-menu-btn[aria-disabled=true], .fba-modal-dialog .usa-menu-btn:disabled:hover, .fba-modal-dialog .usa-menu-btn[aria-disabled=true]:hover, .fba-modal-dialog .usa-menu-btn[aria-disabled=true]:focus{\n  color:#757575;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-menu-btn:disabled, .fba-modal-dialog .usa-menu-btn[aria-disabled=true], .fba-modal-dialog .usa-menu-btn:disabled:hover, .fba-modal-dialog .usa-menu-btn[aria-disabled=true]:hover, .fba-modal-dialog .usa-menu-btn[aria-disabled=true]:focus{\n    color:GrayText;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-menu-btn{\n    display:none;\n  }\n}\n.fba-modal-dialog .usa-menu-btn:hover{\n  background-color:#1a4480;\n  color:white;\n  text-decoration:none;\n}\n.fba-modal-dialog .usa-menu-btn:active{\n  color:white;\n}\n.fba-modal-dialog .usa-menu-btn:visited{\n  color:white;\n}\n\n.fba-modal-dialog .usa-overlay{\n  position:absolute;\n  bottom:0;\n  left:0;\n  right:0;\n  top:0;\n  position:fixed;\n  background:rgba(0, 0, 0, 0.7);\n  opacity:0;\n  transition:opacity 0.15s ease-in-out;\n  visibility:hidden;\n  z-index:400;\n}\n.fba-modal-dialog .usa-overlay.is-visible{\n  opacity:1;\n  visibility:visible;\n}\n\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-header--basic .usa-navbar{\n    position:relative;\n    width:33%;\n  }\n  .fba-modal-dialog .usa-header--basic .usa-nav{\n    flex-direction:row;\n    align-items:center;\n    justify-content:flex-end;\n    display:flex;\n    padding:0 0 0.25rem 0.5rem;\n    width:100%;\n  }\n  .fba-modal-dialog .usa-header--basic .usa-nav-container{\n    align-items:flex-end;\n    justify-content:space-between;\n    display:flex;\n  }\n  .fba-modal-dialog .usa-header--basic .usa-nav__primary-item > .usa-current,\n  .fba-modal-dialog .usa-header--basic .usa-nav__link:hover{\n    position:relative;\n  }\n  .fba-modal-dialog .usa-header--basic .usa-nav__primary-item > .usa-current::after,\n  .fba-modal-dialog .usa-header--basic .usa-nav__link:hover::after{\n    background-color:#005ea2;\n    border-radius:0;\n    content:\"\";\n    display:block;\n    position:absolute;\n    height:0.25rem;\n    left:1rem;\n    right:1rem;\n    bottom:-0.25rem;\n  }\n}\n@media (min-width: 64em) and (forced-colors: active){\n  .fba-modal-dialog .usa-header--basic .usa-nav__primary-item > .usa-current::after,\n  .fba-modal-dialog .usa-header--basic .usa-nav__link:hover::after{\n    background-color:ButtonText;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-header--basic .usa-nav__link[aria-expanded=true]::after,\n  .fba-modal-dialog .usa-header--basic .usa-nav__link[aria-expanded=true]:hover::after{\n    display:none;\n  }\n  .fba-modal-dialog .usa-header--basic .usa-nav__primary{\n    width:auto;\n  }\n  .fba-modal-dialog .usa-header--basic .usa-nav__primary-item:last-of-type{\n    position:relative;\n  }\n  .fba-modal-dialog .usa-header--basic .usa-nav__primary-item:last-of-type .usa-nav__submenu{\n    position:absolute;\n    right:0;\n  }\n  .fba-modal-dialog .usa-header--basic .usa-search{\n    top:0;\n  }\n}\n.fba-modal-dialog .usa-header--basic.usa-header--megamenu .usa-nav__inner{\n  display:flex;\n  flex-direction:column;\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-header--basic.usa-header--megamenu .usa-nav__inner{\n    display:block;\n    float:right;\n    margin-top:-2.5rem;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-header--basic.usa-header--megamenu .usa-nav__primary-item:last-of-type{\n    position:static;\n  }\n}\n\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-header--extended{\n    padding-top:0;\n  }\n  .fba-modal-dialog .usa-header--extended .usa-nav__primary-item > .usa-current,\n  .fba-modal-dialog .usa-header--extended .usa-nav__primary-item > .usa-nav__link:hover{\n    position:relative;\n  }\n  .fba-modal-dialog .usa-header--extended .usa-nav__primary-item > .usa-current::after,\n  .fba-modal-dialog .usa-header--extended .usa-nav__primary-item > .usa-nav__link:hover::after{\n    background-color:#005ea2;\n    border-radius:0;\n    content:\"\";\n    display:block;\n    position:absolute;\n    height:0.25rem;\n    left:1rem;\n    right:1rem;\n    bottom:0rem;\n  }\n}\n@media (min-width: 64em) and (forced-colors: active){\n  .fba-modal-dialog .usa-header--extended .usa-nav__primary-item > .usa-current::after,\n  .fba-modal-dialog .usa-header--extended .usa-nav__primary-item > .usa-nav__link:hover::after{\n    background-color:ButtonText;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-header--extended .usa-nav__link[aria-expanded=true]::after,\n  .fba-modal-dialog .usa-header--extended .usa-nav__link[aria-expanded=true]:hover::after{\n    display:none;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-header--extended .usa-logo{\n    font-size:2.13rem;\n    margin:2rem 0 1.5rem;\n    max-width:33%;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-header--extended .usa-navbar{\n    margin-left:auto;\n    margin-right:auto;\n    max-width:64rem;\n    padding-left:1rem;\n    padding-right:1rem;\n    display:block;\n    height:auto;\n    overflow:auto;\n  }\n}\n@media all and (min-width: 64em) and (min-width: 64em){\n  .fba-modal-dialog .usa-header--extended .usa-navbar{\n    padding-left:2rem;\n    padding-right:2rem;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-header--extended .usa-nav{\n    border-top:1px solid #dfe1e2;\n    padding:0;\n    width:100%;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-header--extended .usa-nav__inner{\n    margin-left:auto;\n    margin-right:auto;\n    max-width:64rem;\n    padding-left:1rem;\n    padding-right:1rem;\n    position:relative;\n  }\n}\n@media all and (min-width: 64em) and (min-width: 64em){\n  .fba-modal-dialog .usa-header--extended .usa-nav__inner{\n    padding-left:2rem;\n    padding-right:2rem;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-header--extended .usa-nav__primary{\n    margin-left:-1rem;\n  }\n  .fba-modal-dialog .usa-header--extended .usa-nav__primary::after{\n    clear:both;\n    content:\"\";\n    display:block;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-header--extended .usa-nav__link{\n    padding-bottom:1rem;\n    padding-top:1rem;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-header--extended .usa-nav__submenu .usa-grid-full{\n    padding-left:0.75rem;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-header--extended .usa-nav__submenu.usa-megamenu{\n    left:0;\n    padding-left:2rem;\n    padding-right:2rem;\n  }\n}\n\n.fba-modal-dialog html.usa-js-loading .usa-nav__submenu,\n.fba-modal-dialog html.usa-js-loading .usa-nav__submenu.usa-megamenu{\n  position:absolute;\n  left:-999em;\n  right:auto;\n}\n\n.fba-modal-dialog .usa-megamenu .usa-col{\n  flex:1 1 auto;\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-megamenu .usa-col{\n    flex:4 1 0%;\n  }\n  .fba-modal-dialog .usa-megamenu .usa-col .usa-nav__submenu-item a{\n    padding-left:0.5rem;\n    padding-right:0.5rem;\n  }\n  .fba-modal-dialog .usa-megamenu .usa-col:first-child .usa-nav__submenu-item a{\n    padding-left:0;\n  }\n  .fba-modal-dialog .usa-megamenu .usa-col:last-child .usa-nav__submenu-item a{\n    padding-right:0;\n  }\n}\n\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-megamenu.usa-nav__submenu{\n    padding-left:0;\n    padding-right:0;\n    padding-bottom:2rem;\n    padding-top:2rem;\n    left:-33%;\n    right:0;\n    width:auto;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-megamenu.usa-nav__submenu::before{\n    position:absolute;\n    bottom:0;\n    top:0;\n    background-color:#162e51;\n    content:\"\";\n    display:block;\n    position:absolute;\n    width:calc(50vw - 32rem + 2rem);\n    right:100%;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-megamenu.usa-nav__submenu::after{\n    position:absolute;\n    bottom:0;\n    top:0;\n    background-color:#162e51;\n    content:\"\";\n    display:block;\n    position:absolute;\n    width:calc(50vw - 32rem + 2rem);\n    left:100%;\n  }\n}\n\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-header--extended .usa-megamenu.usa-nav__submenu::before{\n    position:absolute;\n    bottom:0;\n    top:0;\n    background-color:#162e51;\n    content:\"\";\n    display:block;\n    position:absolute;\n    width:calc(50vw - 32rem);\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-header--extended .usa-megamenu.usa-nav__submenu::after{\n    position:absolute;\n    bottom:0;\n    top:0;\n    background-color:#162e51;\n    content:\"\";\n    display:block;\n    position:absolute;\n    width:calc(50vw - 32rem);\n  }\n}\n\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-nav-container{\n    margin-left:auto;\n    margin-right:auto;\n    max-width:64rem;\n    padding-left:1rem;\n    padding-right:1rem;\n    padding-left:2rem;\n    padding-right:2rem;\n  }\n  .fba-modal-dialog .usa-nav-container::after{\n    clear:both;\n    content:\"\";\n    display:block;\n  }\n}\n@media all and (min-width: 64em) and (min-width: 64em){\n  .fba-modal-dialog .usa-nav-container{\n    padding-left:2rem;\n    padding-right:2rem;\n  }\n}\n\n.fba-modal-dialog .usa-navbar{\n  height:3rem;\n}\n@media all and (max-width: 63.99em){\n  .fba-modal-dialog .usa-navbar{\n    align-items:center;\n    border-bottom:1px solid #dfe1e2;\n    display:flex;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-navbar{\n    border-bottom:none;\n    display:inline-block;\n    height:auto;\n  }\n}\n\n.fba-modal-dialog .usa-hint{\n  color:#71767a;\n}\n\n.fba-modal-dialog .usa-hint--required{\n  color:#b50909;\n}\n\n.fba-modal-dialog .usa-input:disabled, .fba-modal-dialog .usa-input[aria-disabled=true]{\n  color:#454545;\n  background-color:#c9c9c9;\n  cursor:not-allowed;\n  opacity:1;\n  -webkit-text-fill-color:#454545;\n}\n.fba-modal-dialog .usa-input:disabled:hover, .fba-modal-dialog .usa-input:disabled:active, .fba-modal-dialog .usa-input:disabled:focus, .fba-modal-dialog .usa-input:disabled.usa-focus, .fba-modal-dialog .usa-input[aria-disabled=true]:hover, .fba-modal-dialog .usa-input[aria-disabled=true]:active, .fba-modal-dialog .usa-input[aria-disabled=true]:focus, .fba-modal-dialog .usa-input[aria-disabled=true].usa-focus{\n  color:#454545;\n  background-color:#c9c9c9;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-input:disabled, .fba-modal-dialog .usa-input[aria-disabled=true]{\n    border:0;\n    color:GrayText;\n  }\n  .fba-modal-dialog .usa-input:disabled:hover, .fba-modal-dialog .usa-input:disabled:active, .fba-modal-dialog .usa-input:disabled:focus, .fba-modal-dialog .usa-input:disabled.usa-focus, .fba-modal-dialog .usa-input[aria-disabled=true]:hover, .fba-modal-dialog .usa-input[aria-disabled=true]:active, .fba-modal-dialog .usa-input[aria-disabled=true]:focus, .fba-modal-dialog .usa-input[aria-disabled=true].usa-focus{\n    color:GrayText;\n  }\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-input:disabled, .fba-modal-dialog .usa-input[aria-disabled=true]{\n    border:2px solid GrayText;\n  }\n}\n\n.fba-modal-dialog .usa-input--error{\n  border-width:0.25rem;\n  border-color:#b50909;\n  border-style:solid;\n  padding-top:calc(0.5rem - 0.25rem);\n  padding-bottom:calc(0.5rem - 0.25rem);\n}\n\n.fba-modal-dialog .usa-input--success{\n  border-width:0.25rem;\n  border-color:#00a91c;\n  border-style:solid;\n  padding-top:calc(0.5rem - 0.25rem);\n  padding-bottom:calc(0.5rem - 0.25rem);\n}\n\n.fba-modal-dialog .usa-input-list{\n  margin-bottom:0;\n  margin-top:0;\n  list-style-type:none;\n  padding-left:0;\n}\n.fba-modal-dialog .usa-input-list li{\n  line-height:1.3;\n}\n\n.fba-modal-dialog .usa-prose .usa-input-list{\n  margin-bottom:0;\n  margin-top:0;\n  list-style-type:none;\n  padding-left:0;\n}\n.fba-modal-dialog .usa-prose .usa-input-list li{\n  line-height:1.3;\n}\n\n.fba-modal-dialog .usa-intro{\n  font-family:Merriweather Web, Georgia, Cambria, Times New Roman, Times, serif;\n  font-size:1.34rem;\n  line-height:1.8;\n  font-weight:400;\n  max-width:88ex;\n}\n\n.fba-modal-dialog .usa-label{\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:1.06rem;\n  line-height:1.3;\n  display:block;\n  font-weight:normal;\n  margin-top:1.5rem;\n  max-width:30rem;\n}\n\n.fba-modal-dialog .usa-label--error{\n  font-weight:700;\n  margin-top:0;\n}\n\n.fba-modal-dialog .usa-label--required{\n  color:#b50909;\n}\n\n.fba-modal-dialog .usa-legend{\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:1.06rem;\n  line-height:1.3;\n  display:block;\n  font-weight:normal;\n  margin-top:1.5rem;\n  max-width:30rem;\n}\n\n.fba-modal-dialog .usa-legend--large{\n  font-size:2.13rem;\n  font-weight:700;\n  margin-top:1rem;\n}\n\n.fba-modal-dialog .usa-link{\n  color:#005ea2;\n  text-decoration:underline;\n}\n.fba-modal-dialog .usa-link:visited{\n  color:#54278f;\n}\n.fba-modal-dialog .usa-link:hover{\n  color:#1a4480;\n}\n.fba-modal-dialog .usa-link:active{\n  color:#162e51;\n}\n.fba-modal-dialog .usa-link:focus{\n  outline:0.25rem solid #2491ff;\n  outline-offset:0rem;\n}\n\n.fba-modal-dialog .usa-link--external{\n  display:inline;\n}\n.fba-modal-dialog .usa-link--external::before{\n  position:absolute;\n  left:-999em;\n  right:auto;\n  content:\"External.\";\n}\n.fba-modal-dialog .usa-link--external[target=_blank]::before{\n  position:absolute;\n  left:-999em;\n  right:auto;\n  content:\"External, opens in a new tab.\";\n}\n.fba-modal-dialog .usa-link--external::after{\n  background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/launch.svg\");\n  background-repeat:no-repeat;\n  background-position:center center;\n  background-size:1.75ex 1.75ex;\n  display:inline-block;\n  height:1.75ex;\n  width:1.75ex;\n  content:\"\";\n  display:inline;\n  margin-top:0.7ex;\n  margin-left:2px;\n  padding-left:1.75ex;\n  vertical-align:middle;\n}\n@supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n  .fba-modal-dialog .usa-link--external::after{\n    background:none;\n    background-color:currentColor;\n    -webkit-mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/launch.svg\"), linear-gradient(transparent, transparent);\n            mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/launch.svg\"), linear-gradient(transparent, transparent);\n    -webkit-mask-position:center center;\n            mask-position:center center;\n    -webkit-mask-repeat:no-repeat;\n            mask-repeat:no-repeat;\n    -webkit-mask-size:1.75ex 1.75ex;\n            mask-size:1.75ex 1.75ex;\n  }\n}\n.fba-modal-dialog .usa-link--external.usa-link--alt{\n  display:inline;\n}\n.fba-modal-dialog .usa-link--external.usa-link--alt::before{\n  position:absolute;\n  left:-999em;\n  right:auto;\n  content:\"External.\";\n}\n.fba-modal-dialog .usa-link--external.usa-link--alt[target=_blank]::before{\n  position:absolute;\n  left:-999em;\n  right:auto;\n  content:\"External, opens in a new tab.\";\n}\n.fba-modal-dialog .usa-link--external.usa-link--alt::after{\n  background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons-bg/launch--white.svg\");\n  background-repeat:no-repeat;\n  background-position:center center;\n  background-size:1.75ex 1.75ex;\n  display:inline-block;\n  height:1.75ex;\n  width:1.75ex;\n  content:\"\";\n  display:inline;\n  margin-top:0.7ex;\n  margin-left:2px;\n  padding-left:1.75ex;\n  vertical-align:middle;\n}\n@supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n  .fba-modal-dialog .usa-link--external.usa-link--alt::after{\n    background:none;\n    background-color:currentColor;\n    -webkit-mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/launch.svg\"), linear-gradient(transparent, transparent);\n            mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/launch.svg\"), linear-gradient(transparent, transparent);\n    -webkit-mask-position:center center;\n            mask-position:center center;\n    -webkit-mask-repeat:no-repeat;\n            mask-repeat:no-repeat;\n    -webkit-mask-size:1.75ex 1.75ex;\n            mask-size:1.75ex 1.75ex;\n  }\n}\n\n.fba-modal-dialog .usa-list{\n  margin-bottom:1em;\n  margin-top:1em;\n  line-height:1.5;\n  padding-left:3ch;\n}\n.fba-modal-dialog .usa-list:last-child{\n  margin-bottom:0;\n}\n.fba-modal-dialog .usa-list ul,\n.fba-modal-dialog .usa-list ol{\n  margin-top:0.25em;\n}\n.fba-modal-dialog .usa-list li{\n  margin-bottom:0.25em;\n  max-width:68ex;\n}\n.fba-modal-dialog .usa-list li:last-child{\n  margin-bottom:0;\n}\n\n.fba-modal-dialog .usa-list--unstyled{\n  margin-bottom:0;\n  margin-top:0;\n  list-style-type:none;\n  padding-left:0;\n}\n.fba-modal-dialog .usa-list--unstyled > li{\n  margin-bottom:0;\n  max-width:unset;\n}\n\n.fba-modal-dialog .usa-prose .usa-list--unstyled{\n  margin-bottom:0;\n  margin-top:0;\n  list-style-type:none;\n  padding-left:0;\n}\n.fba-modal-dialog .usa-prose .usa-list--unstyled > li{\n  margin-bottom:0;\n  max-width:unset;\n}\n\n@keyframes slidein-left{\n  .fba-modal-dialog from{\n    transform:translateX(15rem);\n  }\n  .fba-modal-dialog to{\n    transform:translateX(0);\n  }\n}\n.fba-modal-dialog .usa-nav{\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:1.06rem;\n  line-height:0.9;\n}\n@media all and (max-width: 63.99em){\n  .fba-modal-dialog .usa-nav{\n    position:absolute;\n    right:0;\n    position:absolute;\n    bottom:0;\n    top:0;\n    position:fixed;\n    background:white;\n    border-right:0;\n    display:none;\n    flex-direction:column;\n    overflow-y:auto;\n    padding:1rem;\n    width:15rem;\n    z-index:500;\n  }\n  .fba-modal-dialog .usa-nav.is-visible{\n    animation:slidein-left 0.3s ease-in-out;\n    display:flex;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-nav{\n    float:right;\n    position:relative;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-nav .usa-search{\n    margin-left:1rem;\n  }\n}\n.fba-modal-dialog .usa-nav .usa-accordion{\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:1.06rem;\n  line-height:0.9;\n}\n\n@media all and (max-width: 63.99em){\n  .fba-modal-dialog .usa-nav__primary{\n    margin-bottom:0;\n    margin-top:0;\n    list-style-type:none;\n    padding-left:0;\n    margin-top:1.5rem;\n    order:2;\n  }\n  .fba-modal-dialog .usa-nav__primary > li{\n    margin-bottom:0;\n    max-width:unset;\n  }\n  .fba-modal-dialog .usa-nav__primary-item{\n    border-top:1px solid #dfe1e2;\n  }\n  .fba-modal-dialog .usa-nav__primary a:not(.usa-button){\n    display:block;\n    padding:0.5rem 1rem;\n    text-decoration:none;\n  }\n  .fba-modal-dialog .usa-nav__primary a:not(.usa-button):hover{\n    background-color:#f0f0f0;\n    text-decoration:none;\n  }\n  .fba-modal-dialog .usa-nav__primary a:not(.usa-button):not(.usa-current){\n    color:#565c65;\n  }\n  .fba-modal-dialog .usa-nav__primary a:not(.usa-button):not(.usa-current):hover{\n    color:#005ea2;\n  }\n  .fba-modal-dialog .usa-nav__primary a:not(.usa-button):not(.usa-current):focus{\n    outline-offset:0;\n  }\n  .fba-modal-dialog .usa-nav__primary .usa-current{\n    position:relative;\n    color:#005ea2;\n    font-weight:700;\n  }\n  .fba-modal-dialog .usa-nav__primary .usa-current::after{\n    background-color:#005ea2;\n    border-radius:99rem;\n    content:\"\";\n    display:block;\n    position:absolute;\n    bottom:0.25rem;\n    top:0.25rem;\n    width:0.25rem;\n    left:0.25rem;\n  }\n}\n@media all and (max-width: 63.99em) and (min-width: 40em){\n  .fba-modal-dialog .usa-nav__primary .usa-current{\n    position:relative;\n  }\n  .fba-modal-dialog .usa-nav__primary .usa-current::after{\n    background-color:#005ea2;\n    border-radius:99rem;\n    content:\"\";\n    display:block;\n    position:absolute;\n    bottom:0.25rem;\n    top:0.25rem;\n    width:0.25rem;\n    left:0rem;\n  }\n}\n@media all and (max-width: 63.99em){\n  .fba-modal-dialog .usa-nav__primary a{\n    padding-bottom:0.75rem;\n    padding-top:0.75rem;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-nav__primary{\n    display:flex;\n    align-items:stretch;\n  }\n}\n.fba-modal-dialog .usa-nav__primary .usa-nav__primary-item a{\n  text-decoration:none;\n}\n.fba-modal-dialog .usa-nav__primary > .usa-nav__primary-item{\n  line-height:1.1;\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-nav__primary > .usa-nav__primary-item{\n    font-size:0.93rem;\n    line-height:0.9;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-nav__primary > .usa-nav__primary-item > a{\n    line-height:0.9;\n    padding:1rem;\n    align-items:center;\n    color:#565c65;\n    display:flex;\n    font-weight:700;\n  }\n  .fba-modal-dialog .usa-nav__primary > .usa-nav__primary-item > a:hover{\n    color:#005ea2;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-nav__primary > .usa-nav__primary-item > button,\n  .fba-modal-dialog .usa-nav__primary > .usa-nav__primary-item > a{\n    height:100%;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-nav__primary a{\n    padding-bottom:0.5rem;\n    padding-top:0.5rem;\n  }\n}\n.fba-modal-dialog .usa-nav__primary button{\n  color:#005ea2;\n  text-decoration:underline;\n  background-color:transparent;\n  border:0;\n  border-radius:0;\n  box-shadow:none;\n  font-weight:normal;\n  justify-content:normal;\n  text-align:left;\n  margin:0;\n  padding:0;\n  position:relative;\n  color:#565c65;\n  font-weight:normal;\n  line-height:1.1;\n  padding:0.75rem 1rem;\n  text-decoration:none;\n}\n.fba-modal-dialog .usa-nav__primary button:visited{\n  color:#54278f;\n}\n.fba-modal-dialog .usa-nav__primary button:hover{\n  color:#1a4480;\n}\n.fba-modal-dialog .usa-nav__primary button:active{\n  color:#162e51;\n}\n.fba-modal-dialog .usa-nav__primary button:focus{\n  outline:0.25rem solid #2491ff;\n  outline-offset:0rem;\n}\n.fba-modal-dialog .usa-nav__primary button:hover, .fba-modal-dialog .usa-nav__primary button.usa-button--hover, .fba-modal-dialog .usa-nav__primary button:disabled:hover, .fba-modal-dialog .usa-nav__primary button[aria-disabled=true]:hover, .fba-modal-dialog .usa-nav__primary button:disabled.usa-button--hover, .fba-modal-dialog .usa-nav__primary button[aria-disabled=true].usa-button--hover, .fba-modal-dialog .usa-nav__primary button:active, .fba-modal-dialog .usa-nav__primary button.usa-button--active, .fba-modal-dialog .usa-nav__primary button:disabled:active, .fba-modal-dialog .usa-nav__primary button[aria-disabled=true]:active, .fba-modal-dialog .usa-nav__primary button:disabled.usa-button--active, .fba-modal-dialog .usa-nav__primary button[aria-disabled=true].usa-button--active, .fba-modal-dialog .usa-nav__primary button:disabled:focus, .fba-modal-dialog .usa-nav__primary button[aria-disabled=true]:focus, .fba-modal-dialog .usa-nav__primary button:disabled.usa-focus, .fba-modal-dialog .usa-nav__primary button[aria-disabled=true].usa-focus, .fba-modal-dialog .usa-nav__primary button:disabled, .fba-modal-dialog .usa-nav__primary button[aria-disabled=true], .fba-modal-dialog .usa-nav__primary button.usa-button--disabled{\n  background-color:transparent;\n  box-shadow:none;\n  text-decoration:underline;\n}\n.fba-modal-dialog .usa-nav__primary button.usa-button--hover{\n  color:#1a4480;\n}\n.fba-modal-dialog .usa-nav__primary button.usa-button--active{\n  color:#162e51;\n}\n.fba-modal-dialog .usa-nav__primary button:disabled, .fba-modal-dialog .usa-nav__primary button[aria-disabled=true], .fba-modal-dialog .usa-nav__primary button:disabled:hover, .fba-modal-dialog .usa-nav__primary button[aria-disabled=true]:hover, .fba-modal-dialog .usa-nav__primary button[aria-disabled=true]:focus{\n  color:#757575;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-nav__primary button:disabled, .fba-modal-dialog .usa-nav__primary button[aria-disabled=true], .fba-modal-dialog .usa-nav__primary button:disabled:hover, .fba-modal-dialog .usa-nav__primary button[aria-disabled=true]:hover, .fba-modal-dialog .usa-nav__primary button[aria-disabled=true]:focus{\n    color:GrayText;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-nav__primary button{\n    line-height:0.9;\n    padding:1rem;\n    font-size:0.93rem;\n    font-weight:700;\n  }\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-nav__primary button{\n    forced-color-adjust:auto;\n  }\n}\n.fba-modal-dialog .usa-nav__primary button:hover{\n  color:#005ea2;\n  background-color:#f0f0f0;\n  text-decoration:none;\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-nav__primary button:hover{\n    background-color:transparent;\n  }\n}\n.fba-modal-dialog .usa-nav__primary button[aria-expanded], .fba-modal-dialog .usa-nav__primary button[aria-expanded]:hover{\n  background-image:none;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-nav__primary button[aria-expanded]::before, .fba-modal-dialog .usa-nav__primary button[aria-expanded]:hover::before{\n    content:none;\n  }\n}\n.fba-modal-dialog .usa-nav__primary button[aria-expanded] span::after{\n  position:absolute;\n  top:50%;\n  right:0;\n  transform:translateY(-50%);\n}\n.fba-modal-dialog .usa-nav__primary button[aria-expanded=false] span::after{\n  background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/add.svg\");\n  background-repeat:no-repeat;\n  background-position:center center;\n  background-size:1.25rem 1.25rem;\n  display:inline-block;\n  height:1.25rem;\n  width:1.25rem;\n  content:\"\";\n  vertical-align:middle;\n  margin-left:auto;\n}\n@supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n  .fba-modal-dialog .usa-nav__primary button[aria-expanded=false] span::after{\n    background:none;\n    background-color:ButtonText;\n    -webkit-mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/add.svg\"), linear-gradient(transparent, transparent);\n            mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/add.svg\"), linear-gradient(transparent, transparent);\n    -webkit-mask-position:center center;\n            mask-position:center center;\n    -webkit-mask-repeat:no-repeat;\n            mask-repeat:no-repeat;\n    -webkit-mask-size:1.25rem 1.25rem;\n            mask-size:1.25rem 1.25rem;\n  }\n}\n.fba-modal-dialog .usa-nav__primary button[aria-expanded=false] span::after:hover{\n  background-color:buttonText;\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-nav__primary button[aria-expanded=false] span::after{\n    background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/expand_more.svg\");\n    background-repeat:no-repeat;\n    background-position:center center;\n    background-size:1rem 1rem;\n    display:inline-block;\n    height:1rem;\n    width:1rem;\n    content:\"\";\n    vertical-align:middle;\n    margin-left:auto;\n  }\n  @supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n    .fba-modal-dialog .usa-nav__primary button[aria-expanded=false] span::after{\n      background:none;\n      background-color:ButtonText;\n      -webkit-mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/expand_more.svg\"), linear-gradient(transparent, transparent);\n              mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/expand_more.svg\"), linear-gradient(transparent, transparent);\n      -webkit-mask-position:center center;\n              mask-position:center center;\n      -webkit-mask-repeat:no-repeat;\n              mask-repeat:no-repeat;\n      -webkit-mask-size:1rem 1rem;\n              mask-size:1rem 1rem;\n    }\n  }\n  .fba-modal-dialog .usa-nav__primary button[aria-expanded=false] span::after{\n    right:0.75rem;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-nav__primary button[aria-expanded=false]:hover span::after{\n    background-color:#1a4480;\n  }\n}\n@media (min-width: 64em) and (forced-colors: active){\n  .fba-modal-dialog .usa-nav__primary button[aria-expanded=false]:hover span::after{\n    background-color:ButtonText;\n  }\n}\n.fba-modal-dialog .usa-nav__primary button[aria-expanded=true] span::after{\n  background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/remove.svg\");\n  background-repeat:no-repeat;\n  background-position:center center;\n  background-size:1.25rem 1.25rem;\n  display:inline-block;\n  height:1.25rem;\n  width:1.25rem;\n  content:\"\";\n  vertical-align:middle;\n  margin-left:auto;\n}\n@supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n  .fba-modal-dialog .usa-nav__primary button[aria-expanded=true] span::after{\n    background:none;\n    background-color:ButtonText;\n    -webkit-mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/remove.svg\"), linear-gradient(transparent, transparent);\n            mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/remove.svg\"), linear-gradient(transparent, transparent);\n    -webkit-mask-position:center center;\n            mask-position:center center;\n    -webkit-mask-repeat:no-repeat;\n            mask-repeat:no-repeat;\n    -webkit-mask-size:1.25rem 1.25rem;\n            mask-size:1.25rem 1.25rem;\n  }\n}\n.fba-modal-dialog .usa-nav__primary button[aria-expanded=true] span::after{\n  position:absolute;\n  right:0;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-nav__primary button[aria-expanded=true] span::after{\n    background-color:ButtonText;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-nav__primary button[aria-expanded=true]{\n    background-image:none;\n    background-color:#162e51;\n    color:white;\n  }\n}\n@media all and (min-width: 64em) and (min-width: 64em){\n  .fba-modal-dialog .usa-nav__primary button[aria-expanded=true] span::after{\n    background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/expand_less.svg\");\n    background-repeat:no-repeat;\n    background-position:center center;\n    background-size:1rem 1rem;\n    display:inline-block;\n    height:1rem;\n    width:1rem;\n    content:\"\";\n    vertical-align:middle;\n    margin-left:auto;\n  }\n  @supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n    .fba-modal-dialog .usa-nav__primary button[aria-expanded=true] span::after{\n      background:none;\n      background-color:ButtonText;\n      -webkit-mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/expand_less.svg\"), linear-gradient(transparent, transparent);\n              mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/expand_less.svg\"), linear-gradient(transparent, transparent);\n      -webkit-mask-position:center center;\n              mask-position:center center;\n      -webkit-mask-repeat:no-repeat;\n              mask-repeat:no-repeat;\n      -webkit-mask-size:1rem 1rem;\n              mask-size:1rem 1rem;\n    }\n  }\n  .fba-modal-dialog .usa-nav__primary button[aria-expanded=true] span::after{\n    right:0.75rem;\n    background-color:white;\n  }\n}\n@media (min-width: 64em) and (min-width: 64em) and (forced-colors: active){\n  .fba-modal-dialog .usa-nav__primary button[aria-expanded=true] span::after{\n    background-color:ButtonText;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-nav__primary .usa-accordion__button span{\n    display:inline-block;\n    margin-right:0;\n    padding-right:1rem;\n  }\n}\n\n.fba-modal-dialog .usa-nav__secondary{\n  margin-top:1rem;\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-nav__secondary{\n    flex-direction:column;\n    align-items:flex-end;\n    bottom:4rem;\n    display:flex;\n    font-size:0.93rem;\n    margin-top:0.5rem;\n    min-width:calc(27ch + 3rem);\n    position:absolute;\n    right:2rem;\n  }\n}\n.fba-modal-dialog .usa-nav__secondary .usa-search{\n  margin-top:1rem;\n  width:100%;\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-nav__secondary .usa-search{\n    margin-left:0;\n    margin-top:0.5rem;\n  }\n}\n\n.fba-modal-dialog .usa-nav__secondary-links{\n  margin-bottom:0;\n  margin-top:0;\n  list-style-type:none;\n  padding-left:0;\n  line-height:1.3;\n  margin-top:1.5rem;\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-nav__secondary-links{\n    -moz-column-gap:0.5rem;\n         column-gap:0.5rem;\n    display:flex;\n    flex-flow:row nowrap;\n    line-height:0.9;\n    margin-bottom:0.25rem;\n    margin-top:0;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-nav__secondary-links .usa-nav__secondary-item{\n    padding-left:0.25rem;\n  }\n  .fba-modal-dialog .usa-nav__secondary-links .usa-nav__secondary-item + .usa-nav__secondary-item{\n    border-left:1px solid #dfe1e2;\n    padding-left:0.5rem;\n  }\n}\n.fba-modal-dialog .usa-nav__secondary-links a{\n  color:#71767a;\n  display:inline-block;\n  font-size:0.93rem;\n  text-decoration:none;\n}\n.fba-modal-dialog .usa-nav__secondary-links a:hover{\n  color:#005ea2;\n  text-decoration:underline;\n}\n\n@media all and (max-width: 63.99em){\n  .fba-modal-dialog .usa-nav__submenu{\n    margin-bottom:0;\n    margin-top:0;\n    list-style-type:none;\n    padding-left:0;\n    margin:0;\n  }\n  .fba-modal-dialog .usa-nav__submenu > li{\n    margin-bottom:0;\n    max-width:unset;\n  }\n  .fba-modal-dialog .usa-nav__submenu-item{\n    border-top:1px solid #dfe1e2;\n    font-size:0.93rem;\n  }\n  .fba-modal-dialog .usa-nav__submenu .usa-current::after{\n    display:none;\n  }\n}\n@media all and (max-width: 63.99em) and (min-width: 40em){\n  .fba-modal-dialog .usa-nav__submenu .usa-current::after{\n    display:none;\n  }\n}\n@media all and (max-width: 63.99em){\n  .fba-modal-dialog .usa-nav__submenu a:not(.usa-button){\n    padding-left:2rem;\n  }\n  .fba-modal-dialog .usa-nav__submenu .usa-nav__submenu a:not(.usa-button){\n    padding-left:3rem;\n  }\n  .fba-modal-dialog .usa-nav__submenu .usa-nav__submenu .usa-nav__submenu a:not(.usa-button){\n    padding-left:4rem;\n  }\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-nav__submenu{\n    margin-bottom:0;\n    margin-top:0;\n    list-style-type:none;\n    padding-left:0;\n    padding-bottom:0.5rem;\n    padding-top:0.5rem;\n    background-color:#162e51;\n    width:15rem;\n    position:absolute;\n    z-index:400;\n  }\n}\n.fba-modal-dialog .usa-nav__submenu[aria-hidden=true]{\n  display:none;\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-nav__submenu .usa-nav__submenu-item a{\n    padding-left:1rem;\n    padding-right:1rem;\n    color:white;\n    line-height:1.3;\n    display:block;\n  }\n  .fba-modal-dialog .usa-nav__submenu .usa-nav__submenu-item a:focus{\n    outline-offset:-0.25rem;\n  }\n  .fba-modal-dialog .usa-nav__submenu .usa-nav__submenu-item a:hover{\n    color:white;\n    text-decoration:underline;\n  }\n}\n\n.fba-modal-dialog .usa-nav__submenu-list{\n  margin-bottom:0;\n  margin-top:0;\n  list-style-type:none;\n  padding-left:0;\n}\n.fba-modal-dialog .usa-nav__submenu-list > li{\n  margin-bottom:0;\n  max-width:unset;\n}\n.fba-modal-dialog .usa-nav__submenu-list .usa-nav__submenu-list-item{\n  margin:0;\n  font-size:0.93rem;\n}\n.fba-modal-dialog .usa-nav__submenu-list .usa-nav__submenu-list-item a{\n  line-height:1.3;\n}\n\n.fba-modal-dialog .usa-nav__close{\n  color:#005ea2;\n  text-decoration:underline;\n  background-color:transparent;\n  border:0;\n  border-radius:0;\n  box-shadow:none;\n  font-weight:normal;\n  justify-content:normal;\n  text-align:left;\n  margin:0;\n  padding:0;\n  height:3rem;\n  width:3rem;\n  background-image:none;\n  color:currentColor;\n  flex:none;\n  float:right;\n  margin:-0.75rem -1rem 1rem auto;\n  text-align:center;\n}\n.fba-modal-dialog .usa-nav__close:visited{\n  color:#54278f;\n}\n.fba-modal-dialog .usa-nav__close:hover{\n  color:#1a4480;\n}\n.fba-modal-dialog .usa-nav__close:active{\n  color:#162e51;\n}\n.fba-modal-dialog .usa-nav__close:focus{\n  outline:0.25rem solid #2491ff;\n  outline-offset:0rem;\n}\n.fba-modal-dialog .usa-nav__close:hover, .fba-modal-dialog .usa-nav__close.usa-button--hover, .fba-modal-dialog .usa-nav__close:disabled:hover, .fba-modal-dialog .usa-nav__close[aria-disabled=true]:hover, .fba-modal-dialog .usa-nav__close:disabled.usa-button--hover, .fba-modal-dialog .usa-nav__close[aria-disabled=true].usa-button--hover, .fba-modal-dialog .usa-nav__close:active, .fba-modal-dialog .usa-nav__close.usa-button--active, .fba-modal-dialog .usa-nav__close:disabled:active, .fba-modal-dialog .usa-nav__close[aria-disabled=true]:active, .fba-modal-dialog .usa-nav__close:disabled.usa-button--active, .fba-modal-dialog .usa-nav__close[aria-disabled=true].usa-button--active, .fba-modal-dialog .usa-nav__close:disabled:focus, .fba-modal-dialog .usa-nav__close[aria-disabled=true]:focus, .fba-modal-dialog .usa-nav__close:disabled.usa-focus, .fba-modal-dialog .usa-nav__close[aria-disabled=true].usa-focus, .fba-modal-dialog .usa-nav__close:disabled, .fba-modal-dialog .usa-nav__close[aria-disabled=true], .fba-modal-dialog .usa-nav__close.usa-button--disabled{\n  background-color:transparent;\n  box-shadow:none;\n  text-decoration:underline;\n}\n.fba-modal-dialog .usa-nav__close.usa-button--hover{\n  color:#1a4480;\n}\n.fba-modal-dialog .usa-nav__close.usa-button--active{\n  color:#162e51;\n}\n.fba-modal-dialog .usa-nav__close:disabled, .fba-modal-dialog .usa-nav__close[aria-disabled=true], .fba-modal-dialog .usa-nav__close:disabled:hover, .fba-modal-dialog .usa-nav__close[aria-disabled=true]:hover, .fba-modal-dialog .usa-nav__close[aria-disabled=true]:focus{\n  color:#757575;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-nav__close:disabled, .fba-modal-dialog .usa-nav__close[aria-disabled=true], .fba-modal-dialog .usa-nav__close:disabled:hover, .fba-modal-dialog .usa-nav__close[aria-disabled=true]:hover, .fba-modal-dialog .usa-nav__close[aria-disabled=true]:focus{\n    color:GrayText;\n  }\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-nav__close::before{\n    background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/close.svg\");\n    background-repeat:no-repeat;\n    background-position:center center;\n    background-size:1.25rem 1.25rem;\n    display:inline-block;\n    height:1.25rem;\n    width:1.25rem;\n    content:\"\";\n    vertical-align:middle;\n    margin-right:auto;\n  }\n  @supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n    .fba-modal-dialog .usa-nav__close::before{\n      background:none;\n      background-color:ButtonText;\n      -webkit-mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/close.svg\"), linear-gradient(transparent, transparent);\n              mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/close.svg\"), linear-gradient(transparent, transparent);\n      -webkit-mask-position:center center;\n              mask-position:center center;\n      -webkit-mask-repeat:no-repeat;\n              mask-repeat:no-repeat;\n      -webkit-mask-size:1.25rem 1.25rem;\n              mask-size:1.25rem 1.25rem;\n    }\n  }\n  .fba-modal-dialog .usa-nav__close::before{\n    background-color:buttonText;\n  }\n}\n.fba-modal-dialog .usa-nav__close:hover{\n  color:currentColor;\n  text-decoration:none;\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-nav__close{\n    display:none;\n  }\n}\n.fba-modal-dialog .usa-nav__close img{\n  width:1.5rem;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-nav__close img{\n    display:none;\n  }\n}\n.fba-modal-dialog .usa-nav__close + *{\n  clear:both;\n}\n\n.fba-modal-dialog .usa-js-mobile-nav--active{\n  overflow:hidden;\n}\n\n@media (min-width: 63.06rem){\n  .fba-modal-dialog .usa-js-mobile-nav--active.is-safari{\n    overflow-y:scroll;\n    position:fixed;\n    top:var(--scrolltop, 0);\n  }\n}\n.fba-modal-dialog .usa-prose{\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:1.06rem;\n  line-height:1.5;\n}\n.fba-modal-dialog .usa-prose > ul,\n.fba-modal-dialog .usa-prose > ol{\n  margin-bottom:1em;\n  margin-top:1em;\n  line-height:1.5;\n  padding-left:3ch;\n}\n.fba-modal-dialog .usa-prose > ul:last-child,\n.fba-modal-dialog .usa-prose > ol:last-child{\n  margin-bottom:0;\n}\n.fba-modal-dialog .usa-prose > ul ul,\n.fba-modal-dialog .usa-prose > ul ol,\n.fba-modal-dialog .usa-prose > ol ul,\n.fba-modal-dialog .usa-prose > ol ol{\n  margin-top:0.25em;\n}\n.fba-modal-dialog .usa-prose > ul li,\n.fba-modal-dialog .usa-prose > ol li{\n  margin-bottom:0.25em;\n  max-width:68ex;\n}\n.fba-modal-dialog .usa-prose > ul li:last-child,\n.fba-modal-dialog .usa-prose > ol li:last-child{\n  margin-bottom:0;\n}\n.fba-modal-dialog .usa-prose > table{\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:1.06rem;\n  line-height:1.5;\n  border-collapse:collapse;\n  border-spacing:0;\n  color:#1b1b1b;\n  margin:1.25rem 0;\n  text-align:left;\n}\n.fba-modal-dialog .usa-prose > table thead th{\n  background-clip:padding-box;\n  color:#1b1b1b;\n  font-weight:700;\n  line-height:1.3;\n}\n.fba-modal-dialog .usa-prose > table thead th,\n.fba-modal-dialog .usa-prose > table thead td{\n  background-color:#dfe1e2;\n  color:#1b1b1b;\n}\n.fba-modal-dialog .usa-prose > table tbody th{\n  text-align:left;\n}\n.fba-modal-dialog .usa-prose > table th,\n.fba-modal-dialog .usa-prose > table td{\n  background-color:white;\n  border:1px solid #1b1b1b;\n  font-weight:normal;\n  padding:0.5rem 1rem;\n}\n.fba-modal-dialog .usa-prose > table caption{\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:1rem;\n  font-weight:700;\n  margin-bottom:0.75rem;\n  text-align:left;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable]{\n  padding-right:2.5rem;\n  position:relative;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable]::after{\n  border-bottom-color:transparent;\n  border-bottom-style:solid;\n  border-bottom-width:1px;\n  bottom:0;\n  content:\"\";\n  height:0;\n  left:0;\n  position:absolute;\n  width:100%;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button{\n  color:#005ea2;\n  text-decoration:underline;\n  background-color:transparent;\n  border:0;\n  border-radius:0;\n  box-shadow:none;\n  font-weight:normal;\n  justify-content:normal;\n  text-align:left;\n  margin:0;\n  padding:0;\n  height:2rem;\n  width:2rem;\n  background-position:center center;\n  background-size:1.5rem;\n  color:#71767a;\n  cursor:pointer;\n  display:inline-block;\n  margin:0;\n  position:absolute;\n  right:0.25rem;\n  text-align:center;\n  text-decoration:none;\n  top:50%;\n  transform:translate(0, -50%);\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button:visited, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button:visited{\n  color:#54278f;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button:hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button:hover{\n  color:#1a4480;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button:active, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button:active{\n  color:#162e51;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button:focus, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button:focus{\n  outline:0.25rem solid #2491ff;\n  outline-offset:0rem;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button:hover, .fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button.usa-button--hover, .fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button:disabled:hover, .fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button[aria-disabled=true]:hover, .fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button:disabled.usa-button--hover, .fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button[aria-disabled=true].usa-button--hover, .fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button:active, .fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button.usa-button--active, .fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button:disabled:active, .fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button[aria-disabled=true]:active, .fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button:disabled.usa-button--active, .fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button[aria-disabled=true].usa-button--active, .fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button:disabled:focus, .fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button[aria-disabled=true]:focus, .fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button:disabled.usa-focus, .fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button[aria-disabled=true].usa-focus, .fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button:disabled, .fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button[aria-disabled=true], .fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button.usa-button--disabled, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button:hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button.usa-button--hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button:disabled:hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button[aria-disabled=true]:hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button:disabled.usa-button--hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button[aria-disabled=true].usa-button--hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button:active, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button.usa-button--active, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button:disabled:active, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button[aria-disabled=true]:active, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button:disabled.usa-button--active, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button[aria-disabled=true].usa-button--active, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button:disabled:focus, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button[aria-disabled=true]:focus, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button:disabled.usa-focus, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button[aria-disabled=true].usa-focus, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button:disabled, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button[aria-disabled=true], .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button.usa-button--disabled{\n  background-color:transparent;\n  box-shadow:none;\n  text-decoration:underline;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button.usa-button--hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button.usa-button--hover{\n  color:#1a4480;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button.usa-button--active, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button.usa-button--active{\n  color:#162e51;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button:disabled, .fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button[aria-disabled=true], .fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button:disabled:hover, .fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button[aria-disabled=true]:hover, .fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button[aria-disabled=true]:focus, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button:disabled, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button[aria-disabled=true], .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button:disabled:hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button[aria-disabled=true]:hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button[aria-disabled=true]:focus{\n  color:#757575;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button:disabled, .fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button[aria-disabled=true], .fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button:disabled:hover, .fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button[aria-disabled=true]:hover, .fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button[aria-disabled=true]:focus, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button:disabled, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button[aria-disabled=true], .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button:disabled:hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button[aria-disabled=true]:hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button[aria-disabled=true]:focus{\n    color:GrayText;\n  }\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button .usa-icon, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button .usa-icon{\n  height:1.5rem;\n  width:1.5rem;\n  vertical-align:middle;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button .usa-icon > g, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button .usa-icon > g{\n  fill:transparent;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button .usa-icon > g.unsorted, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button .usa-icon > g.unsorted{\n  fill:#1b1b1b;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable]:not([aria-sort]) .usa-table__header__button:hover .usa-icon > g.unsorted, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=none] .usa-table__header__button:hover .usa-icon > g.unsorted{\n  fill:black;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending], .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending]{\n  background-color:#97d4ea;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button{\n  color:#005ea2;\n  text-decoration:underline;\n  background-color:transparent;\n  border:0;\n  border-radius:0;\n  box-shadow:none;\n  font-weight:normal;\n  justify-content:normal;\n  text-align:left;\n  margin:0;\n  padding:0;\n  height:2rem;\n  width:2rem;\n  background-position:center center;\n  background-size:1.5rem;\n  color:#71767a;\n  cursor:pointer;\n  display:inline-block;\n  margin:0;\n  position:absolute;\n  right:0.25rem;\n  text-align:center;\n  text-decoration:none;\n  top:50%;\n  transform:translate(0, -50%);\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button:visited{\n  color:#54278f;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button:hover{\n  color:#1a4480;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button:active{\n  color:#162e51;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button:focus{\n  outline:0.25rem solid #2491ff;\n  outline-offset:0rem;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button:hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button.usa-button--hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button:disabled:hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button[aria-disabled=true]:hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button:disabled.usa-button--hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button[aria-disabled=true].usa-button--hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button:active, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button.usa-button--active, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button:disabled:active, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button[aria-disabled=true]:active, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button:disabled.usa-button--active, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button[aria-disabled=true].usa-button--active, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button:disabled:focus, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button[aria-disabled=true]:focus, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button:disabled.usa-focus, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button[aria-disabled=true].usa-focus, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button:disabled, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button[aria-disabled=true], .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button.usa-button--disabled{\n  background-color:transparent;\n  box-shadow:none;\n  text-decoration:underline;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button.usa-button--hover{\n  color:#1a4480;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button.usa-button--active{\n  color:#162e51;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button:disabled, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button[aria-disabled=true], .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button:disabled:hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button[aria-disabled=true]:hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button[aria-disabled=true]:focus{\n  color:#757575;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button:disabled, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button[aria-disabled=true], .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button:disabled:hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button[aria-disabled=true]:hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button[aria-disabled=true]:focus{\n    color:GrayText;\n  }\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button .usa-icon{\n  height:1.5rem;\n  width:1.5rem;\n  vertical-align:middle;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button .usa-icon > g{\n  fill:transparent;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=descending] .usa-table__header__button .usa-icon > g.descending{\n  fill:#1b1b1b;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button{\n  color:#005ea2;\n  text-decoration:underline;\n  background-color:transparent;\n  border:0;\n  border-radius:0;\n  box-shadow:none;\n  font-weight:normal;\n  justify-content:normal;\n  text-align:left;\n  margin:0;\n  padding:0;\n  height:2rem;\n  width:2rem;\n  background-position:center center;\n  background-size:1.5rem;\n  color:#71767a;\n  cursor:pointer;\n  display:inline-block;\n  margin:0;\n  position:absolute;\n  right:0.25rem;\n  text-align:center;\n  text-decoration:none;\n  top:50%;\n  transform:translate(0, -50%);\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button:visited{\n  color:#54278f;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button:hover{\n  color:#1a4480;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button:active{\n  color:#162e51;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button:focus{\n  outline:0.25rem solid #2491ff;\n  outline-offset:0rem;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button:hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button.usa-button--hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button:disabled:hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button[aria-disabled=true]:hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button:disabled.usa-button--hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button[aria-disabled=true].usa-button--hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button:active, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button.usa-button--active, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button:disabled:active, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button[aria-disabled=true]:active, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button:disabled.usa-button--active, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button[aria-disabled=true].usa-button--active, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button:disabled:focus, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button[aria-disabled=true]:focus, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button:disabled.usa-focus, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button[aria-disabled=true].usa-focus, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button:disabled, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button[aria-disabled=true], .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button.usa-button--disabled{\n  background-color:transparent;\n  box-shadow:none;\n  text-decoration:underline;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button.usa-button--hover{\n  color:#1a4480;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button.usa-button--active{\n  color:#162e51;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button:disabled, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button[aria-disabled=true], .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button:disabled:hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button[aria-disabled=true]:hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button[aria-disabled=true]:focus{\n  color:#757575;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button:disabled, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button[aria-disabled=true], .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button:disabled:hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button[aria-disabled=true]:hover, .fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button[aria-disabled=true]:focus{\n    color:GrayText;\n  }\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button .usa-icon{\n  height:1.5rem;\n  width:1.5rem;\n  vertical-align:middle;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button .usa-icon > g{\n  fill:transparent;\n}\n.fba-modal-dialog .usa-prose > table th[data-sortable][aria-sort=ascending] .usa-table__header__button .usa-icon > g.ascending{\n  fill:#1b1b1b;\n}\n.fba-modal-dialog .usa-prose > table thead th[aria-sort]{\n  background-color:#97d4ea;\n  color:#1b1b1b;\n}\n.fba-modal-dialog .usa-prose > table td[data-sort-active],\n.fba-modal-dialog .usa-prose > table th[data-sort-active]{\n  background-color:#e1f3f8;\n  color:#1b1b1b;\n}\n.fba-modal-dialog .usa-prose > .usa-table--borderless thead{\n}\n.fba-modal-dialog .usa-prose > .usa-table--borderless thead th{\n  background-color:white;\n  border-top:0;\n  color:#1b1b1b;\n}\n.fba-modal-dialog .usa-prose > .usa-table--borderless thead th[aria-sort]{\n  color:#1b1b1b;\n}\n.fba-modal-dialog .usa-prose > .usa-table--borderless thead th[data-sortable]:not([aria-sort]) .usa-table__header__button .usa-icon > g.unsorted{\n  fill:#1b1b1b;\n}\n.fba-modal-dialog .usa-prose > .usa-table--borderless thead th[data-sortable]:not([aria-sort]) .usa-table__header__button:hover .usa-icon > g.unsorted{\n  fill:black;\n}\n.fba-modal-dialog .usa-prose > .usa-table--borderless th,\n.fba-modal-dialog .usa-prose > .usa-table--borderless td{\n  border-left:0;\n  border-right:0;\n}\n.fba-modal-dialog .usa-prose > .usa-table--compact th,\n.fba-modal-dialog .usa-prose > .usa-table--compact td{\n  padding:0.25rem 0.75rem;\n}\n.fba-modal-dialog .usa-prose > .usa-table--striped tbody tr:nth-child(odd) td,\n.fba-modal-dialog .usa-prose > .usa-table--striped tbody tr:nth-child(odd) th{\n  background-color:#f0f0f0;\n  color:#1b1b1b;\n}\n.fba-modal-dialog .usa-prose > .usa-table--striped tbody tr:nth-child(odd) td[data-sort-active],\n.fba-modal-dialog .usa-prose > .usa-table--striped tbody tr:nth-child(odd) th[data-sort-active]{\n  background-color:#c3ebfa;\n  color:#1b1b1b;\n}\n@media all and (max-width: 29.99em){\n  .fba-modal-dialog .usa-prose > .usa-table--stacked thead{\n    display:none;\n  }\n  .fba-modal-dialog .usa-prose > .usa-table--stacked th,\n  .fba-modal-dialog .usa-prose > .usa-table--stacked td{\n    border-bottom-width:0;\n    display:block;\n    width:100%;\n  }\n  .fba-modal-dialog .usa-prose > .usa-table--stacked tr{\n    border-bottom:0.25rem solid #1b1b1b;\n    border-top-width:0;\n    width:100%;\n  }\n  .fba-modal-dialog .usa-prose > .usa-table--stacked tr th:first-child,\n  .fba-modal-dialog .usa-prose > .usa-table--stacked tr td:first-child{\n    border-top-width:0;\n  }\n  .fba-modal-dialog .usa-prose > .usa-table--stacked tr:nth-child(odd) td,\n  .fba-modal-dialog .usa-prose > .usa-table--stacked tr:nth-child(odd) th{\n    background-color:inherit;\n  }\n  .fba-modal-dialog .usa-prose > .usa-table--stacked tr:first-child th:first-child,\n  .fba-modal-dialog .usa-prose > .usa-table--stacked tr:first-child td:first-child{\n    border-top:0.25rem solid #1b1b1b;\n  }\n  .fba-modal-dialog .usa-prose > .usa-table--stacked th[data-label],\n  .fba-modal-dialog .usa-prose > .usa-table--stacked td[data-label]{\n    padding-bottom:0.75rem;\n  }\n  .fba-modal-dialog .usa-prose > .usa-table--stacked th[data-label]:before,\n  .fba-modal-dialog .usa-prose > .usa-table--stacked td[data-label]:before{\n    content:attr(data-label);\n    display:block;\n    font-weight:700;\n    margin:-0.5rem -1rem 0rem;\n    padding:0.75rem 1rem 0.25rem;\n  }\n}\n@media all and (max-width: 29.99em){\n  .fba-modal-dialog .usa-prose > .usa-table--stacked-header thead{\n    display:none;\n  }\n  .fba-modal-dialog .usa-prose > .usa-table--stacked-header th,\n  .fba-modal-dialog .usa-prose > .usa-table--stacked-header td{\n    border-bottom-width:0;\n    display:block;\n    width:100%;\n  }\n  .fba-modal-dialog .usa-prose > .usa-table--stacked-header tr{\n    border-bottom:0.25rem solid #1b1b1b;\n    border-top-width:0;\n    width:100%;\n  }\n  .fba-modal-dialog .usa-prose > .usa-table--stacked-header tr th:first-child,\n  .fba-modal-dialog .usa-prose > .usa-table--stacked-header tr td:first-child{\n    border-top-width:0;\n  }\n  .fba-modal-dialog .usa-prose > .usa-table--stacked-header tr:nth-child(odd) td,\n  .fba-modal-dialog .usa-prose > .usa-table--stacked-header tr:nth-child(odd) th{\n    background-color:inherit;\n  }\n  .fba-modal-dialog .usa-prose > .usa-table--stacked-header tr:first-child th:first-child,\n  .fba-modal-dialog .usa-prose > .usa-table--stacked-header tr:first-child td:first-child{\n    border-top:0.25rem solid #1b1b1b;\n  }\n  .fba-modal-dialog .usa-prose > .usa-table--stacked-header th[data-label],\n  .fba-modal-dialog .usa-prose > .usa-table--stacked-header td[data-label]{\n    padding-bottom:0.75rem;\n  }\n  .fba-modal-dialog .usa-prose > .usa-table--stacked-header th[data-label]:before,\n  .fba-modal-dialog .usa-prose > .usa-table--stacked-header td[data-label]:before{\n    content:attr(data-label);\n    display:block;\n    font-weight:700;\n    margin:-0.5rem -1rem 0rem;\n    padding:0.75rem 1rem 0.25rem;\n  }\n  .fba-modal-dialog .usa-prose > .usa-table--stacked-header tr td:first-child,\n  .fba-modal-dialog .usa-prose > .usa-table--stacked-header tr th:first-child{\n    font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n    font-size:1.06rem;\n    line-height:1.1;\n    background-color:#dfe1e2;\n    color:#1b1b1b;\n    font-weight:700;\n    padding:0.75rem 1rem;\n  }\n  .fba-modal-dialog .usa-prose > .usa-table--stacked-header tr td:first-child:before,\n  .fba-modal-dialog .usa-prose > .usa-table--stacked-header tr th:first-child:before{\n    display:none;\n  }\n}\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked thead{\n  display:none;\n}\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked th,\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked td{\n  border-bottom-width:0;\n  display:block;\n  width:100%;\n}\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked tr{\n  border-bottom:0.25rem solid #1b1b1b;\n  border-top-width:0;\n  width:100%;\n}\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked tr th:first-child,\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked tr td:first-child{\n  border-top-width:0;\n}\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked tr:nth-child(odd) td,\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked tr:nth-child(odd) th{\n  background-color:inherit;\n}\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked tr:first-child th:first-child,\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked tr:first-child td:first-child{\n  border-top:0.25rem solid #1b1b1b;\n}\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked th[data-label],\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked td[data-label]{\n  padding-bottom:0.75rem;\n}\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked th[data-label]:before,\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked td[data-label]:before{\n  content:attr(data-label);\n  display:block;\n  font-weight:700;\n  margin:-0.5rem -1rem 0rem;\n  padding:0.75rem 1rem 0.25rem;\n}\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked-header thead{\n  display:none;\n}\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked-header th,\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked-header td{\n  border-bottom-width:0;\n  display:block;\n  width:100%;\n}\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked-header tr{\n  border-bottom:0.25rem solid #1b1b1b;\n  border-top-width:0;\n  width:100%;\n}\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked-header tr th:first-child,\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked-header tr td:first-child{\n  border-top-width:0;\n}\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked-header tr:nth-child(odd) td,\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked-header tr:nth-child(odd) th{\n  background-color:inherit;\n}\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked-header tr:first-child th:first-child,\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked-header tr:first-child td:first-child{\n  border-top:0.25rem solid #1b1b1b;\n}\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked-header th[data-label],\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked-header td[data-label]{\n  padding-bottom:0.75rem;\n}\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked-header th[data-label]:before,\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked-header td[data-label]:before{\n  content:attr(data-label);\n  display:block;\n  font-weight:700;\n  margin:-0.5rem -1rem 0rem;\n  padding:0.75rem 1rem 0.25rem;\n}\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked-header tr td:first-child,\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked-header tr th:first-child{\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:1.06rem;\n  line-height:1.1;\n  background-color:#dfe1e2;\n  color:#1b1b1b;\n  font-weight:700;\n  padding:0.75rem 1rem;\n}\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked-header tr td:first-child:before,\n.fba-modal-dialog .usa-prose > .width-mobile .usa-table--stacked-header tr th:first-child:before{\n  display:none;\n}\n.fba-modal-dialog .usa-prose > .usa-table-container--scrollable{\n  margin:1.25rem 0;\n  overflow-y:hidden;\n}\n.fba-modal-dialog .usa-prose > .usa-table-container--scrollable .usa-table{\n  margin:0;\n}\n.fba-modal-dialog .usa-prose > .usa-table-container--scrollable td{\n  white-space:nowrap;\n}\n.fba-modal-dialog .usa-prose > p{\n  line-height:1.5;\n  max-width:68ex;\n}\n.fba-modal-dialog .usa-prose > h1,\n.fba-modal-dialog .usa-prose > h2,\n.fba-modal-dialog .usa-prose > h3,\n.fba-modal-dialog .usa-prose > h4,\n.fba-modal-dialog .usa-prose > h5,\n.fba-modal-dialog .usa-prose > h6{\n  margin-bottom:0;\n  margin-top:0;\n  clear:both;\n}\n.fba-modal-dialog .usa-prose > * + *{\n  margin-top:1em;\n  margin-bottom:0;\n}\n.fba-modal-dialog .usa-prose > * + h1,\n.fba-modal-dialog .usa-prose > * + h2,\n.fba-modal-dialog .usa-prose > * + h3,\n.fba-modal-dialog .usa-prose > * + h4,\n.fba-modal-dialog .usa-prose > * + h5,\n.fba-modal-dialog .usa-prose > * + h6{\n  margin-top:1.5em;\n}\n.fba-modal-dialog .usa-prose > h1{\n  font-family:Merriweather Web, Georgia, Cambria, Times New Roman, Times, serif;\n  font-size:2.44rem;\n  line-height:1.2;\n  font-weight:700;\n}\n.fba-modal-dialog .usa-prose > h2{\n  font-family:Merriweather Web, Georgia, Cambria, Times New Roman, Times, serif;\n  font-size:1.95rem;\n  line-height:1.2;\n  font-weight:700;\n}\n.fba-modal-dialog .usa-prose > h3{\n  font-family:Merriweather Web, Georgia, Cambria, Times New Roman, Times, serif;\n  font-size:1.34rem;\n  line-height:1.2;\n  font-weight:700;\n}\n.fba-modal-dialog .usa-prose > h4{\n  font-family:Merriweather Web, Georgia, Cambria, Times New Roman, Times, serif;\n  font-size:0.98rem;\n  line-height:1.2;\n  font-weight:700;\n}\n.fba-modal-dialog .usa-prose > h5{\n  font-family:Merriweather Web, Georgia, Cambria, Times New Roman, Times, serif;\n  font-size:0.91rem;\n  line-height:1.2;\n  font-weight:700;\n}\n.fba-modal-dialog .usa-prose > h6{\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:0.87rem;\n  line-height:1.1;\n  font-weight:normal;\n  letter-spacing:0.025em;\n  text-transform:uppercase;\n}\n\n.fba-modal-dialog .usa-radio{\n  background:white;\n}\n\n.fba-modal-dialog .usa-radio__label{\n  color:#1b1b1b;\n}\n.fba-modal-dialog .usa-radio__label::before{\n  background:white;\n  box-shadow:0 0 0 2px #1b1b1b;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-radio__label::before{\n    outline:2px solid transparent;\n    outline-offset:2px;\n  }\n}\n\n.fba-modal-dialog .usa-radio__input:checked + [class*=__label]::before{\n  background-color:#005ea2;\n  box-shadow:0 0 0 2px #005ea2;\n}\n.fba-modal-dialog .usa-radio__input:disabled + [class*=__label], .fba-modal-dialog .usa-radio__input[aria-disabled=true] + [class*=__label]{\n  color:#757575;\n  cursor:not-allowed;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-radio__input:disabled + [class*=__label], .fba-modal-dialog .usa-radio__input[aria-disabled=true] + [class*=__label]{\n    color:GrayText;\n  }\n}\n.fba-modal-dialog .usa-radio__input:disabled + [class*=__label]::before, .fba-modal-dialog .usa-radio__input[aria-disabled=true] + [class*=__label]::before{\n  background-color:white;\n  box-shadow:0 0 0 2px #757575;\n}\n.fba-modal-dialog .usa-radio__input--tile + [class*=__label]{\n  background-color:white;\n  border:2px solid #c9c9c9;\n  color:#1b1b1b;\n}\n.fba-modal-dialog .usa-radio__input--tile:checked + [class*=__label]{\n  background-color:rgba(0, 94, 162, 0.1);\n  border-color:#005ea2;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-radio__input--tile:checked + [class*=__label]{\n    border:ButtonText solid 0.25rem;\n  }\n}\n.fba-modal-dialog .usa-radio__input--tile:disabled + [class*=__label], .fba-modal-dialog .usa-radio__input--tile[aria-disabled=true] + [class*=__label]{\n  border-color:#e6e6e6;\n}\n.fba-modal-dialog .usa-radio__input--tile:disabled:checked + [class*=__label], .fba-modal-dialog .usa-radio__input--tile:disabled:indeterminate + [class*=__label], .fba-modal-dialog .usa-radio__input--tile:disabled[data-indeterminate] + [class*=__label], .fba-modal-dialog .usa-radio__input--tile[aria-disabled=true]:checked + [class*=__label], .fba-modal-dialog .usa-radio__input--tile[aria-disabled=true]:indeterminate + [class*=__label], .fba-modal-dialog .usa-radio__input--tile[aria-disabled=true][data-indeterminate] + [class*=__label]{\n  background-color:white;\n}\n\n.fba-modal-dialog .usa-radio__input:checked + [class*=__label]::before{\n  box-shadow:0 0 0 2px #005ea2, inset 0 0 0 2px white;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-radio__input:checked + [class*=__label]::before{\n    background-color:ButtonText;\n  }\n}\n.fba-modal-dialog .usa-radio__input:checked:disabled + [class*=__label]::before, .fba-modal-dialog .usa-radio__input:checked[aria-disabled=true] + [class*=__label]::before{\n  background-color:#757575;\n  box-shadow:0 0 0 2px #757575, inset 0 0 0 2px white;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-radio__input:checked:disabled + [class*=__label]::before, .fba-modal-dialog .usa-radio__input:checked[aria-disabled=true] + [class*=__label]::before{\n    background-color:GrayText;\n  }\n}\n\n.fba-modal-dialog .usa-radio__input{\n  position:absolute;\n  left:-999em;\n  right:auto;\n}\n.fba-modal-dialog .usa-radio__input:focus + [class*=__label]::before{\n  outline:0.25rem solid #2491ff;\n  outline-offset:0.25rem;\n}\n.fba-modal-dialog .usa-radio__input--tile + [class*=__label]{\n  border-radius:0.25rem;\n  margin-top:0.5rem;\n  padding:0.75rem 1rem 0.75rem 2.5rem;\n}\n.fba-modal-dialog .usa-radio__input--tile + [class*=__label]::before{\n  left:0.5rem;\n}\n\n@media print{\n  .fba-modal-dialog .usa-radio__input:checked + [class*=__label]::before{\n    box-shadow:inset 0 0 0 2px white, inset 0 0 0 1rem #005ea2, 0 0 0 2px #005ea2;\n  }\n}\n\n.fba-modal-dialog .usa-radio__label{\n  cursor:pointer;\n  display:inherit;\n  font-weight:normal;\n  margin-top:0.75rem;\n  padding-left:2rem;\n  position:relative;\n}\n.fba-modal-dialog .usa-radio__label::before{\n  content:\" \";\n  display:block;\n  left:0;\n  margin-left:2px;\n  margin-top:0.064rem;\n  position:absolute;\n}\n\n.fba-modal-dialog .usa-radio__label::before{\n  height:1.25rem;\n  border-radius:99rem;\n  width:1.25rem;\n}\n\n.fba-modal-dialog .usa-radio__label-description{\n  display:block;\n  font-size:0.93rem;\n  margin-top:0.5rem;\n}\n.fba-modal-dialog .usa-range{\n  -webkit-appearance:none;\n     -moz-appearance:none;\n          appearance:none;\n  border:none;\n  padding-left:1px;\n  width:100%;\n}\n.fba-modal-dialog .usa-range:focus{\n  outline:none;\n}\n.fba-modal-dialog .usa-range:focus::-webkit-slider-thumb{\n  background-color:white;\n  box-shadow:0 0 0 2px #2491ff;\n}\n.fba-modal-dialog .usa-range:focus::-moz-range-thumb{\n  background-color:white;\n  box-shadow:0 0 0 2px #2491ff;\n}\n.fba-modal-dialog .usa-range:focus::-ms-thumb{\n  background-color:white;\n  box-shadow:0 0 0 2px #2491ff;\n}\n.fba-modal-dialog .usa-range::-webkit-slider-runnable-track{\n  background-color:#f0f0f0;\n  border-radius:99rem;\n  border:1px solid #71767a;\n  cursor:pointer;\n  height:1rem;\n  width:100%;\n}\n.fba-modal-dialog .usa-range::-moz-range-track{\n  background-color:#f0f0f0;\n  border-radius:99rem;\n  border:1px solid #71767a;\n  cursor:pointer;\n  height:1rem;\n  width:100%;\n}\n.fba-modal-dialog .usa-range::-ms-track{\n  background-color:#f0f0f0;\n  border-radius:99rem;\n  border:1px solid #71767a;\n  cursor:pointer;\n  height:1rem;\n  width:100%;\n}\n.fba-modal-dialog .usa-range::-webkit-slider-thumb{\n  height:1.25rem;\n  border-radius:99rem;\n  width:1.25rem;\n  background:#f0f0f0;\n  border:none;\n  box-shadow:0 0 0 2px #71767a;\n  cursor:pointer;\n  -webkit-appearance:none;\n          appearance:none;\n  margin-top:-0.19rem;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-range::-webkit-slider-thumb{\n    outline:2px solid transparent;\n  }\n}\n.fba-modal-dialog .usa-range::-moz-range-thumb{\n  height:1.25rem;\n  border-radius:99rem;\n  width:1.25rem;\n  background:#f0f0f0;\n  border:none;\n  box-shadow:0 0 0 2px #71767a;\n  cursor:pointer;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-range::-moz-range-thumb{\n    outline:2px solid transparent;\n  }\n}\n.fba-modal-dialog .usa-range::-ms-thumb{\n  height:1.25rem;\n  border-radius:99rem;\n  width:1.25rem;\n  background:#f0f0f0;\n  border:none;\n  box-shadow:0 0 0 2px #71767a;\n  cursor:pointer;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-range::-ms-thumb{\n    outline:2px solid transparent;\n  }\n}\n.fba-modal-dialog .usa-range::-ms-fill-lower{\n  background-color:#f0f0f0;\n  border-radius:99rem;\n  border:1px solid #71767a;\n}\n.fba-modal-dialog .usa-range::-ms-fill-upper{\n  background-color:#f0f0f0;\n  border-radius:99rem;\n  border:1px solid #71767a;\n}\n.fba-modal-dialog .usa-range:disabled, .fba-modal-dialog .usa-range[aria-disabled=true]{\n  opacity:1;\n}\n.fba-modal-dialog .usa-range:disabled::-webkit-slider-runnable-track, .fba-modal-dialog .usa-range[aria-disabled=true]::-webkit-slider-runnable-track{\n  color:#454545;\n  background-color:#c9c9c9;\n  cursor:not-allowed;\n  opacity:1;\n}\n.fba-modal-dialog .usa-range:disabled::-webkit-slider-runnable-track:hover, .fba-modal-dialog .usa-range:disabled::-webkit-slider-runnable-track:active, .fba-modal-dialog .usa-range:disabled::-webkit-slider-runnable-track:focus, .fba-modal-dialog .usa-range:disabled::-webkit-slider-runnable-track.usa-focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-webkit-slider-runnable-track:hover, .fba-modal-dialog .usa-range[aria-disabled=true]::-webkit-slider-runnable-track:active, .fba-modal-dialog .usa-range[aria-disabled=true]::-webkit-slider-runnable-track:focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-webkit-slider-runnable-track.usa-focus{\n  color:#454545;\n  background-color:#c9c9c9;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-range:disabled::-webkit-slider-runnable-track, .fba-modal-dialog .usa-range[aria-disabled=true]::-webkit-slider-runnable-track{\n    border:0;\n    color:GrayText;\n  }\n  .fba-modal-dialog .usa-range:disabled::-webkit-slider-runnable-track:hover, .fba-modal-dialog .usa-range:disabled::-webkit-slider-runnable-track:active, .fba-modal-dialog .usa-range:disabled::-webkit-slider-runnable-track:focus, .fba-modal-dialog .usa-range:disabled::-webkit-slider-runnable-track.usa-focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-webkit-slider-runnable-track:hover, .fba-modal-dialog .usa-range[aria-disabled=true]::-webkit-slider-runnable-track:active, .fba-modal-dialog .usa-range[aria-disabled=true]::-webkit-slider-runnable-track:focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-webkit-slider-runnable-track.usa-focus{\n    color:GrayText;\n  }\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-range:disabled::-webkit-slider-runnable-track, .fba-modal-dialog .usa-range[aria-disabled=true]::-webkit-slider-runnable-track{\n    border:2px solid GrayText;\n  }\n}\n.fba-modal-dialog .usa-range:disabled::-moz-range-track, .fba-modal-dialog .usa-range[aria-disabled=true]::-moz-range-track{\n  color:#454545;\n  background-color:#c9c9c9;\n  cursor:not-allowed;\n  opacity:1;\n}\n.fba-modal-dialog .usa-range:disabled::-moz-range-track:hover, .fba-modal-dialog .usa-range:disabled::-moz-range-track:active, .fba-modal-dialog .usa-range:disabled::-moz-range-track:focus, .fba-modal-dialog .usa-range:disabled::-moz-range-track.usa-focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-moz-range-track:hover, .fba-modal-dialog .usa-range[aria-disabled=true]::-moz-range-track:active, .fba-modal-dialog .usa-range[aria-disabled=true]::-moz-range-track:focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-moz-range-track.usa-focus{\n  color:#454545;\n  background-color:#c9c9c9;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-range:disabled::-moz-range-track, .fba-modal-dialog .usa-range[aria-disabled=true]::-moz-range-track{\n    border:0;\n    color:GrayText;\n  }\n  .fba-modal-dialog .usa-range:disabled::-moz-range-track:hover, .fba-modal-dialog .usa-range:disabled::-moz-range-track:active, .fba-modal-dialog .usa-range:disabled::-moz-range-track:focus, .fba-modal-dialog .usa-range:disabled::-moz-range-track.usa-focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-moz-range-track:hover, .fba-modal-dialog .usa-range[aria-disabled=true]::-moz-range-track:active, .fba-modal-dialog .usa-range[aria-disabled=true]::-moz-range-track:focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-moz-range-track.usa-focus{\n    color:GrayText;\n  }\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-range:disabled::-moz-range-track, .fba-modal-dialog .usa-range[aria-disabled=true]::-moz-range-track{\n    border:2px solid GrayText;\n  }\n}\n.fba-modal-dialog .usa-range:disabled::-ms-track, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-track{\n  color:#454545;\n  background-color:#c9c9c9;\n  cursor:not-allowed;\n  opacity:1;\n}\n.fba-modal-dialog .usa-range:disabled::-ms-track:hover, .fba-modal-dialog .usa-range:disabled::-ms-track:active, .fba-modal-dialog .usa-range:disabled::-ms-track:focus, .fba-modal-dialog .usa-range:disabled::-ms-track.usa-focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-track:hover, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-track:active, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-track:focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-track.usa-focus{\n  color:#454545;\n  background-color:#c9c9c9;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-range:disabled::-ms-track, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-track{\n    border:0;\n    color:GrayText;\n  }\n  .fba-modal-dialog .usa-range:disabled::-ms-track:hover, .fba-modal-dialog .usa-range:disabled::-ms-track:active, .fba-modal-dialog .usa-range:disabled::-ms-track:focus, .fba-modal-dialog .usa-range:disabled::-ms-track.usa-focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-track:hover, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-track:active, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-track:focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-track.usa-focus{\n    color:GrayText;\n  }\n}\n.fba-modal-dialog .usa-range:disabled::-webkit-slider-thumb, .fba-modal-dialog .usa-range[aria-disabled=true]::-webkit-slider-thumb{\n  color:#454545;\n  background-color:#c9c9c9;\n  cursor:not-allowed;\n  opacity:1;\n}\n.fba-modal-dialog .usa-range:disabled::-webkit-slider-thumb:hover, .fba-modal-dialog .usa-range:disabled::-webkit-slider-thumb:active, .fba-modal-dialog .usa-range:disabled::-webkit-slider-thumb:focus, .fba-modal-dialog .usa-range:disabled::-webkit-slider-thumb.usa-focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-webkit-slider-thumb:hover, .fba-modal-dialog .usa-range[aria-disabled=true]::-webkit-slider-thumb:active, .fba-modal-dialog .usa-range[aria-disabled=true]::-webkit-slider-thumb:focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-webkit-slider-thumb.usa-focus{\n  color:#454545;\n  background-color:#c9c9c9;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-range:disabled::-webkit-slider-thumb, .fba-modal-dialog .usa-range[aria-disabled=true]::-webkit-slider-thumb{\n    border:0;\n    color:GrayText;\n  }\n  .fba-modal-dialog .usa-range:disabled::-webkit-slider-thumb:hover, .fba-modal-dialog .usa-range:disabled::-webkit-slider-thumb:active, .fba-modal-dialog .usa-range:disabled::-webkit-slider-thumb:focus, .fba-modal-dialog .usa-range:disabled::-webkit-slider-thumb.usa-focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-webkit-slider-thumb:hover, .fba-modal-dialog .usa-range[aria-disabled=true]::-webkit-slider-thumb:active, .fba-modal-dialog .usa-range[aria-disabled=true]::-webkit-slider-thumb:focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-webkit-slider-thumb.usa-focus{\n    color:GrayText;\n  }\n}\n.fba-modal-dialog .usa-range:disabled::-moz-range-thumb, .fba-modal-dialog .usa-range[aria-disabled=true]::-moz-range-thumb{\n  color:#454545;\n  background-color:#c9c9c9;\n  cursor:not-allowed;\n  opacity:1;\n}\n.fba-modal-dialog .usa-range:disabled::-moz-range-thumb:hover, .fba-modal-dialog .usa-range:disabled::-moz-range-thumb:active, .fba-modal-dialog .usa-range:disabled::-moz-range-thumb:focus, .fba-modal-dialog .usa-range:disabled::-moz-range-thumb.usa-focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-moz-range-thumb:hover, .fba-modal-dialog .usa-range[aria-disabled=true]::-moz-range-thumb:active, .fba-modal-dialog .usa-range[aria-disabled=true]::-moz-range-thumb:focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-moz-range-thumb.usa-focus{\n  color:#454545;\n  background-color:#c9c9c9;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-range:disabled::-moz-range-thumb, .fba-modal-dialog .usa-range[aria-disabled=true]::-moz-range-thumb{\n    border:0;\n    color:GrayText;\n  }\n  .fba-modal-dialog .usa-range:disabled::-moz-range-thumb:hover, .fba-modal-dialog .usa-range:disabled::-moz-range-thumb:active, .fba-modal-dialog .usa-range:disabled::-moz-range-thumb:focus, .fba-modal-dialog .usa-range:disabled::-moz-range-thumb.usa-focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-moz-range-thumb:hover, .fba-modal-dialog .usa-range[aria-disabled=true]::-moz-range-thumb:active, .fba-modal-dialog .usa-range[aria-disabled=true]::-moz-range-thumb:focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-moz-range-thumb.usa-focus{\n    color:GrayText;\n  }\n}\n.fba-modal-dialog .usa-range:disabled::-ms-thumb, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-thumb{\n  color:#454545;\n  background-color:#c9c9c9;\n  cursor:not-allowed;\n  opacity:1;\n}\n.fba-modal-dialog .usa-range:disabled::-ms-thumb:hover, .fba-modal-dialog .usa-range:disabled::-ms-thumb:active, .fba-modal-dialog .usa-range:disabled::-ms-thumb:focus, .fba-modal-dialog .usa-range:disabled::-ms-thumb.usa-focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-thumb:hover, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-thumb:active, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-thumb:focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-thumb.usa-focus{\n  color:#454545;\n  background-color:#c9c9c9;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-range:disabled::-ms-thumb, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-thumb{\n    border:0;\n    color:GrayText;\n  }\n  .fba-modal-dialog .usa-range:disabled::-ms-thumb:hover, .fba-modal-dialog .usa-range:disabled::-ms-thumb:active, .fba-modal-dialog .usa-range:disabled::-ms-thumb:focus, .fba-modal-dialog .usa-range:disabled::-ms-thumb.usa-focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-thumb:hover, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-thumb:active, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-thumb:focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-thumb.usa-focus{\n    color:GrayText;\n  }\n}\n.fba-modal-dialog .usa-range:disabled::-ms-fill-lower, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-fill-lower{\n  color:#454545;\n  background-color:#c9c9c9;\n  cursor:not-allowed;\n  opacity:1;\n}\n.fba-modal-dialog .usa-range:disabled::-ms-fill-lower:hover, .fba-modal-dialog .usa-range:disabled::-ms-fill-lower:active, .fba-modal-dialog .usa-range:disabled::-ms-fill-lower:focus, .fba-modal-dialog .usa-range:disabled::-ms-fill-lower.usa-focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-fill-lower:hover, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-fill-lower:active, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-fill-lower:focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-fill-lower.usa-focus{\n  color:#454545;\n  background-color:#c9c9c9;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-range:disabled::-ms-fill-lower, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-fill-lower{\n    border:0;\n    color:GrayText;\n  }\n  .fba-modal-dialog .usa-range:disabled::-ms-fill-lower:hover, .fba-modal-dialog .usa-range:disabled::-ms-fill-lower:active, .fba-modal-dialog .usa-range:disabled::-ms-fill-lower:focus, .fba-modal-dialog .usa-range:disabled::-ms-fill-lower.usa-focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-fill-lower:hover, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-fill-lower:active, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-fill-lower:focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-fill-lower.usa-focus{\n    color:GrayText;\n  }\n}\n.fba-modal-dialog .usa-range:disabled::-ms-fill-upper, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-fill-upper{\n  color:#454545;\n  background-color:#c9c9c9;\n  cursor:not-allowed;\n  opacity:1;\n}\n.fba-modal-dialog .usa-range:disabled::-ms-fill-upper:hover, .fba-modal-dialog .usa-range:disabled::-ms-fill-upper:active, .fba-modal-dialog .usa-range:disabled::-ms-fill-upper:focus, .fba-modal-dialog .usa-range:disabled::-ms-fill-upper.usa-focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-fill-upper:hover, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-fill-upper:active, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-fill-upper:focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-fill-upper.usa-focus{\n  color:#454545;\n  background-color:#c9c9c9;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-range:disabled::-ms-fill-upper, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-fill-upper{\n    border:0;\n    color:GrayText;\n  }\n  .fba-modal-dialog .usa-range:disabled::-ms-fill-upper:hover, .fba-modal-dialog .usa-range:disabled::-ms-fill-upper:active, .fba-modal-dialog .usa-range:disabled::-ms-fill-upper:focus, .fba-modal-dialog .usa-range:disabled::-ms-fill-upper.usa-focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-fill-upper:hover, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-fill-upper:active, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-fill-upper:focus, .fba-modal-dialog .usa-range[aria-disabled=true]::-ms-fill-upper.usa-focus{\n    color:GrayText;\n  }\n}\n\n.fba-modal-dialog .usa-select{\n  background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/unfold_more.svg\"), linear-gradient(transparent, transparent);\n  background-repeat:no-repeat;\n  -webkit-appearance:none;\n     -moz-appearance:none;\n          appearance:none;\n  background-color:white;\n  background-position:right 0.5rem center;\n  background-size:1.25rem;\n  padding-right:2rem;\n}\n.fba-modal-dialog .usa-select::-ms-expand{\n  display:none;\n}\n.fba-modal-dialog .usa-select:-webkit-autofill{\n  -webkit-appearance:menulist;\n          appearance:menulist;\n}\n.fba-modal-dialog .usa-select:-moz-focusring{\n  color:transparent;\n  text-shadow:0 0 0 black;\n}\n.fba-modal-dialog .usa-select[multiple]{\n  height:auto;\n  background-image:none;\n  padding-right:0;\n}\n.fba-modal-dialog .usa-select option{\n  overflow:hidden;\n  text-overflow:ellipsis;\n}\n.fba-modal-dialog .usa-select:disabled, .fba-modal-dialog .usa-select[aria-disabled=true]{\n  color:#454545;\n  background-color:#c9c9c9;\n  cursor:not-allowed;\n  opacity:1;\n}\n.fba-modal-dialog .usa-select:disabled:hover, .fba-modal-dialog .usa-select:disabled:active, .fba-modal-dialog .usa-select:disabled:focus, .fba-modal-dialog .usa-select:disabled.usa-focus, .fba-modal-dialog .usa-select[aria-disabled=true]:hover, .fba-modal-dialog .usa-select[aria-disabled=true]:active, .fba-modal-dialog .usa-select[aria-disabled=true]:focus, .fba-modal-dialog .usa-select[aria-disabled=true].usa-focus{\n  color:#454545;\n  background-color:#c9c9c9;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-select:disabled, .fba-modal-dialog .usa-select[aria-disabled=true]{\n    border:0;\n    color:GrayText;\n  }\n  .fba-modal-dialog .usa-select:disabled:hover, .fba-modal-dialog .usa-select:disabled:active, .fba-modal-dialog .usa-select:disabled:focus, .fba-modal-dialog .usa-select:disabled.usa-focus, .fba-modal-dialog .usa-select[aria-disabled=true]:hover, .fba-modal-dialog .usa-select[aria-disabled=true]:active, .fba-modal-dialog .usa-select[aria-disabled=true]:focus, .fba-modal-dialog .usa-select[aria-disabled=true].usa-focus{\n    color:GrayText;\n  }\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-select:disabled, .fba-modal-dialog .usa-select[aria-disabled=true]{\n    border:2px solid GrayText;\n  }\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-select{\n    -webkit-appearance:listbox;\n       -moz-appearance:listbox;\n            appearance:listbox;\n    background-image:none;\n    padding-right:0;\n  }\n}\n\n.fba-modal-dialog .usa-search{\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:1.06rem;\n  line-height:1.5;\n  position:relative;\n}\n.fba-modal-dialog .usa-search::after{\n  clear:both;\n  content:\"\";\n  display:block;\n}\n.fba-modal-dialog .usa-search[role=search], .fba-modal-dialog .usa-search[role=search] > div, .fba-modal-dialog .usa-search [role=search]{\n  display:flex;\n}\n.fba-modal-dialog .usa-search [type=submit]{\n  border-bottom-left-radius:0;\n  border-top-left-radius:0;\n  height:2rem;\n  margin:0;\n  padding:0;\n  width:3rem;\n}\n@media all and (min-width: 30em){\n  .fba-modal-dialog .usa-search [type=submit]{\n    padding-left:1rem;\n    padding-right:1rem;\n    width:auto;\n  }\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-search [type=submit]::before{\n    background-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/search.svg\");\n    background-repeat:no-repeat;\n    background-position:center center;\n    background-size:1.5rem 1.5rem;\n    display:inline-block;\n    height:1.5rem;\n    width:1.5rem;\n    content:\"\";\n    vertical-align:middle;\n    margin-right:auto;\n  }\n  @supports ((-webkit-mask: url(\"\")) or (mask: url(\"\"))){\n    .fba-modal-dialog .usa-search [type=submit]::before{\n      background:none;\n      background-color:ButtonText;\n      -webkit-mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/search.svg\"), linear-gradient(transparent, transparent);\n              mask-image:url(\"https://touchpoints.app.cloud.gov/img/usa-icons/search.svg\"), linear-gradient(transparent, transparent);\n      -webkit-mask-position:center center;\n              mask-position:center center;\n      -webkit-mask-repeat:no-repeat;\n              mask-repeat:no-repeat;\n      -webkit-mask-size:1.5rem 1.5rem;\n              mask-size:1.5rem 1.5rem;\n    }\n  }\n  .fba-modal-dialog .usa-search [type=submit]:focus{\n    outline-offset:0;\n  }\n}\n@media (forced-colors: active) and (min-width: 30em){\n  .fba-modal-dialog .usa-search [type=submit]::before{\n    content:none;\n  }\n}\n@media all and (min-width: 30em){\n  .fba-modal-dialog .usa-search__submit-icon{\n    display:none;\n  }\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-search__submit-icon{\n    display:none;\n  }\n}\n\n@media all and (min-width: 30em){\n  .fba-modal-dialog .usa-search--big [type=search],\n  .fba-modal-dialog .usa-search--big .usa-search__input{\n    font-size:1.06rem;\n    height:3rem;\n  }\n}\n@media all and (min-width: 30em){\n  .fba-modal-dialog .usa-search--big [type=submit],\n  .fba-modal-dialog .usa-search--big .usa-search__submit{\n    padding-left:2rem;\n    padding-right:2rem;\n    font-size:1.46rem;\n    height:3rem;\n    width:auto;\n  }\n}\n\n.fba-modal-dialog .usa-search--small [type=submit],\n.fba-modal-dialog .usa-search--small .usa-search__submit{\n  padding-left:0.75rem;\n  padding-right:0.75rem;\n  min-width:3rem;\n}\n@media (forced-colors: active) and (min-width: 30em){\n  .fba-modal-dialog .usa-search--small [type=submit]::before{\n    content:\"\";\n  }\n}\n.fba-modal-dialog .usa-search--small .usa-search__submit-icon{\n  height:1.5rem;\n  width:1.5rem;\n  display:block;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-search--small .usa-search__submit-icon{\n    display:none;\n  }\n}\n\n.fba-modal-dialog input[type=search]{\n  box-sizing:border-box;\n  -webkit-appearance:none;\n     -moz-appearance:none;\n          appearance:none;\n}\n\n.fba-modal-dialog [type=search],\n.fba-modal-dialog .usa-search__input{\n  padding-bottom:0;\n  padding-top:0;\n  border-bottom-right-radius:0;\n  border-right:none;\n  border-top-right-radius:0;\n  box-sizing:border-box;\n  float:left;\n  font-size:1rem;\n  height:2rem;\n  margin:0;\n}\n\n.fba-modal-dialog .usa-search__submit-text{\n  display:none;\n}\n@media all and (min-width: 30em){\n  .fba-modal-dialog .usa-search__submit-text{\n    display:block;\n  }\n}\n\n.fba-modal-dialog .usa-step-indicator{\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:1.06rem;\n  line-height:1.1;\n  background-color:white;\n  margin-bottom:2rem;\n  margin-left:-1px;\n  margin-right:-1px;\n}\n@media all and (min-width: 40em){\n  .fba-modal-dialog .usa-step-indicator{\n    margin-left:0;\n    margin-right:0;\n  }\n}\n\n.fba-modal-dialog .usa-step-indicator__segments{\n  counter-reset:usa-step-indicator;\n  display:flex;\n  list-style:none;\n  margin:0;\n  padding:0;\n}\n\n.fba-modal-dialog .usa-step-indicator__segment{\n  flex:1 1 0%;\n  counter-increment:usa-step-indicator;\n  margin-left:1px;\n  margin-right:1px;\n  max-width:15rem;\n  min-height:0.5rem;\n  position:relative;\n}\n.fba-modal-dialog .usa-step-indicator__segment:after{\n  background-color:#919191;\n  content:\"\";\n  display:block;\n  height:0.5rem;\n  left:0;\n  position:absolute;\n  right:0;\n  top:0;\n}\n@media all and (min-width: 40em){\n  .fba-modal-dialog .usa-step-indicator__segment:after{\n    height:0.5rem;\n  }\n}\n\n.fba-modal-dialog .usa-step-indicator__segment--complete::after{\n  background-color:#162e51;\n}\n.fba-modal-dialog .usa-step-indicator__segment--complete .usa-step-indicator__segment-label{\n  color:#162e51;\n}\n\n.fba-modal-dialog .usa-step-indicator__segment--current::after{\n  background-color:#005ea2;\n}\n.fba-modal-dialog .usa-step-indicator__segment--current .usa-step-indicator__segment-label{\n  color:#005ea2;\n  font-weight:700;\n}\n\n.fba-modal-dialog .usa-step-indicator__segment-label{\n  display:none;\n}\n@media all and (min-width: 40em){\n  .fba-modal-dialog .usa-step-indicator__segment-label{\n    color:#565c65;\n    display:block;\n    font-size:1.06rem;\n    margin-top:calc(0.5rem + 0.5rem);\n    padding-right:2rem;\n    text-align:left;\n  }\n}\n\n.fba-modal-dialog .usa-step-indicator__header{\n  align-items:baseline;\n  display:flex;\n}\n\n.fba-modal-dialog .usa-step-indicator__heading{\n  color:#1b1b1b;\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:1.13rem;\n  font-weight:700;\n  margin:1rem 0 0;\n}\n@media all and (min-width: 40em){\n  .fba-modal-dialog .usa-step-indicator__heading{\n    font-size:1.46rem;\n    margin-top:2rem;\n  }\n}\n\n.fba-modal-dialog .usa-step-indicator__current-step{\n  height:2.5rem;\n  border-radius:99rem;\n  width:2.5rem;\n  font-weight:normal;\n  font-feature-settings:\"tnum\" 1, \"kern\" 1;\n  background-color:#005ea2;\n  color:white;\n  display:inline-block;\n  padding:calc((2.5rem - 2ex * 1.1) * 0.5);\n  text-align:center;\n}\n\n.fba-modal-dialog .usa-step-indicator__total-steps{\n  font-weight:normal;\n  font-feature-settings:\"tnum\" 1, \"kern\" 1;\n  color:#005ea2;\n  margin-right:0.5rem;\n}\n\n@media all and (min-width: 40em){\n  .fba-modal-dialog .usa-step-indicator--counters .usa-step-indicator__segment,\n  .fba-modal-dialog .usa-step-indicator--counters-sm .usa-step-indicator__segment{\n    margin-left:0;\n    margin-right:0;\n    margin-top:calc((2.5rem - 0.5rem) / 2 + 0.25rem);\n  }\n  .fba-modal-dialog .usa-step-indicator--counters .usa-step-indicator__segment:before,\n  .fba-modal-dialog .usa-step-indicator--counters-sm .usa-step-indicator__segment:before{\n    height:2.5rem;\n    border-radius:99rem;\n    width:2.5rem;\n    font-feature-settings:\"tnum\" 1, \"kern\" 1;\n    background-color:white;\n    box-shadow:inset 0 0 0 0.25rem #919191, 0 0 0 0.25rem white;\n    color:#565c65;\n    content:counter(usa-step-indicator);\n    display:block;\n    font-weight:700;\n    left:0;\n    line-height:0.9;\n    padding:calc((2.5rem - 2ex * 0.9) * 0.5);\n    position:absolute;\n    text-align:center;\n    top:calc((2.5rem - 0.5rem) / -2);\n    z-index:100;\n  }\n  .fba-modal-dialog .usa-step-indicator--counters .usa-step-indicator__segment:last-child:after,\n  .fba-modal-dialog .usa-step-indicator--counters-sm .usa-step-indicator__segment:last-child:after{\n    display:none;\n  }\n}\n.fba-modal-dialog .usa-step-indicator--counters .usa-step-indicator__segment--complete::before,\n.fba-modal-dialog .usa-step-indicator--counters-sm .usa-step-indicator__segment--complete::before{\n  background-color:#162e51;\n  box-shadow:0 0 0 0.25rem white;\n  color:white;\n}\n.fba-modal-dialog .usa-step-indicator--counters .usa-step-indicator__segment--current::before,\n.fba-modal-dialog .usa-step-indicator--counters-sm .usa-step-indicator__segment--current::before{\n  background-color:#005ea2;\n  box-shadow:0 0 0 0.25rem white;\n  color:white;\n}\n@media all and (min-width: 40em){\n  .fba-modal-dialog .usa-step-indicator--counters .usa-step-indicator__segment-label,\n  .fba-modal-dialog .usa-step-indicator--counters-sm .usa-step-indicator__segment-label{\n    margin-top:calc((2.5rem + 0.5rem) / 2 + 0.5rem);\n  }\n}\n@media all and (min-width: 40em){\n  .fba-modal-dialog .usa-step-indicator--counters.usa-step-indicator--center .usa-step-indicator__segment:first-child:after,\n  .fba-modal-dialog .usa-step-indicator--counters-sm.usa-step-indicator--center .usa-step-indicator__segment:first-child:after{\n    left:50%;\n    right:0;\n    width:auto;\n  }\n  .fba-modal-dialog .usa-step-indicator--counters.usa-step-indicator--center .usa-step-indicator__segment:last-child:after,\n  .fba-modal-dialog .usa-step-indicator--counters-sm.usa-step-indicator--center .usa-step-indicator__segment:last-child:after{\n    display:block;\n    left:0;\n    right:50%;\n    width:auto;\n  }\n}\n\n@media all and (min-width: 40em){\n  .fba-modal-dialog .usa-step-indicator--counters-sm .usa-step-indicator__segment{\n    margin-top:calc((1.5rem - 0.5rem) / 2 + 0.25rem);\n  }\n  .fba-modal-dialog .usa-step-indicator--counters-sm .usa-step-indicator__segment:before{\n    height:1.5rem;\n    border-radius:99rem;\n    width:1.5rem;\n    font-size:0.93rem;\n    padding:calc(0.25rem + 1px);\n    top:calc((1.5rem - 0.5rem) / -2);\n  }\n  .fba-modal-dialog .usa-step-indicator--counters-sm .usa-step-indicator__segment:last-child:after{\n    display:none;\n  }\n}\n@media all and (min-width: 40em){\n  .fba-modal-dialog .usa-step-indicator--counters-sm .usa-step-indicator__segment-label{\n    margin-top:calc((1.5rem + 0.5rem) / 2 + 0.5rem);\n  }\n}\n\n.fba-modal-dialog .usa-step-indicator--no-labels{\n  margin-left:-1px;\n  margin-right:-1px;\n}\n.fba-modal-dialog .usa-step-indicator--no-labels .usa-step-indicator__segment{\n  margin-top:0;\n  margin-left:1px;\n  margin-right:1px;\n}\n.fba-modal-dialog .usa-step-indicator--no-labels .usa-step-indicator__segment:before{\n  display:none;\n}\n.fba-modal-dialog .usa-step-indicator--no-labels .usa-step-indicator__segment:last-child:after{\n  display:block;\n}\n.fba-modal-dialog .usa-step-indicator--no-labels .usa-step-indicator__heading{\n  margin-top:1rem;\n}\n\n.fba-modal-dialog .usa-step-indicator--no-labels .usa-step-indicator__segment-label{\n  display:none;\n}\n\n.fba-modal-dialog .usa-step-indicator--center{\n  margin-left:-1px;\n  margin-right:-1px;\n}\n.fba-modal-dialog .usa-step-indicator--center .usa-step-indicator__segment{\n  margin-left:1px;\n  margin-right:1px;\n}\n.fba-modal-dialog .usa-step-indicator--center .usa-step-indicator__segment:before{\n  left:calc(50% - (2.5rem + 0.25rem) / 2);\n}\n.fba-modal-dialog .usa-step-indicator--center .usa-step-indicator__segment-label{\n  padding-left:0.5rem;\n  padding-right:0.5rem;\n  text-align:center;\n}\n.fba-modal-dialog .usa-step-indicator--center.usa-step-indicator--no-labels .usa-step-indicator__segment:first-child:after{\n  left:0;\n}\n.fba-modal-dialog .usa-step-indicator--center.usa-step-indicator--no-labels .usa-step-indicator__segment:last-child:after{\n  right:0;\n}\n.fba-modal-dialog .usa-step-indicator--center.usa-step-indicator--counters-sm .usa-step-indicator__segment:before{\n  left:calc(50% - (1.5rem + 0.25rem) / 2);\n}\n\n.fba-modal-dialog .usa-tag{\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:0.93rem;\n  color:white;\n  text-transform:uppercase;\n  background-color:#565c65;\n  border-radius:2px;\n  margin-right:0.25rem;\n  padding:1px 0.5rem;\n}\n.fba-modal-dialog .usa-tag:only-of-type{\n  margin-right:0;\n}\n\n.fba-modal-dialog .usa-tag--big{\n  padding-left:0.5rem;\n  padding-right:0.5rem;\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:1.06rem;\n}\n\n.fba-modal-dialog .usa-textarea:disabled, .fba-modal-dialog .usa-textarea[aria-disabled=true]{\n  color:#454545;\n  background-color:#c9c9c9;\n  cursor:not-allowed;\n  opacity:1;\n}\n.fba-modal-dialog .usa-textarea:disabled:hover, .fba-modal-dialog .usa-textarea:disabled:active, .fba-modal-dialog .usa-textarea:disabled:focus, .fba-modal-dialog .usa-textarea:disabled.usa-focus, .fba-modal-dialog .usa-textarea[aria-disabled=true]:hover, .fba-modal-dialog .usa-textarea[aria-disabled=true]:active, .fba-modal-dialog .usa-textarea[aria-disabled=true]:focus, .fba-modal-dialog .usa-textarea[aria-disabled=true].usa-focus{\n  color:#454545;\n  background-color:#c9c9c9;\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-textarea:disabled, .fba-modal-dialog .usa-textarea[aria-disabled=true]{\n    border:0;\n    color:GrayText;\n  }\n  .fba-modal-dialog .usa-textarea:disabled:hover, .fba-modal-dialog .usa-textarea:disabled:active, .fba-modal-dialog .usa-textarea:disabled:focus, .fba-modal-dialog .usa-textarea:disabled.usa-focus, .fba-modal-dialog .usa-textarea[aria-disabled=true]:hover, .fba-modal-dialog .usa-textarea[aria-disabled=true]:active, .fba-modal-dialog .usa-textarea[aria-disabled=true]:focus, .fba-modal-dialog .usa-textarea[aria-disabled=true].usa-focus{\n    color:GrayText;\n  }\n}\n@media (forced-colors: active){\n  .fba-modal-dialog .usa-textarea:disabled, .fba-modal-dialog .usa-textarea[aria-disabled=true]{\n    border:2px solid GrayText;\n  }\n}\n\n.fba-modal-dialog .usa-textarea{\n  height:10rem;\n}\n\n/*! normalize.css v3.0.3 | MIT License | github.com/necolas/normalize.css */\n.fba-modal-dialog html{\n  font-family:sans-serif;\n  -ms-text-size-adjust:100%;\n  -webkit-text-size-adjust:100%;\n}\n.fba-modal-dialog body{\n  margin:0;\n}\n\n.fba-modal-dialog *,\n.fba-modal-dialog *::before,\n.fba-modal-dialog *::after{\n  -webkit-box-sizing:inherit;\n          box-sizing:inherit;\n}\n\n.fba-modal-dialog {\n  background-color:white;\n  color:#1b1b1b;\n  overflow-x:hidden;\n  -webkit-font-feature-settings:\'kern\' 1;\n          font-feature-settings:\'kern\' 1;\n  -webkit-font-kerning:normal;\n          font-kerning:normal;\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:100%;\n  -webkit-box-sizing:border-box;\n  box-sizing:border-box;\n}\n\n.fba-modal-dialog .usa-sr-only{\n  position:absolute;\n  left:-999em;\n}\n\n.fba-modal img{\n  max-width:100%;\n}\n\n.fba-modal-dialog .usa-media-link{\n  display:inline-block;\n  line-height:0;\n}\n\n.fba-modal-dialog .usa-memorable-date{\n  display:flex;\n}\n\n.fba-modal-dialog .usa-memorable-date [type=number]{\n  -moz-appearance:textfield;\n}\n\n.fba-modal-dialog .usa-memorable-date [type=number]::-webkit-inner-spin-button{\n  -webkit-appearance:none;\n          appearance:none;\n}\n\n.fba-modal-dialog .usa-memorable-date [type=number]::-webkit-contacts-auto-fill-button{\n  visibility:hidden;\n  display:none !important;\n  pointer-events:none;\n  height:0;\n  width:0;\n  margin:0;\n}\n\n.fba-modal-dialog .grid-container{\n  margin-left:auto;\n  margin-right:auto;\n  max-width:64rem;\n  padding-left:1rem;\n  padding-right:1rem;\n}\n\n.fba-modal-dialog .grid-container-card{\n  margin-left:auto;\n  margin-right:auto;\n  max-width:10rem;\n  padding-left:1rem;\n  padding-right:1rem;\n}\n\n.fba-modal-dialog .grid-container-card-lg{\n  margin-left:auto;\n  margin-right:auto;\n  max-width:15rem;\n  padding-left:1rem;\n  padding-right:1rem;\n}\n\n.fba-modal-dialog .grid-container-mobile{\n  margin-left:auto;\n  margin-right:auto;\n  max-width:20rem;\n  padding-left:1rem;\n  padding-right:1rem;\n}\n\n.fba-modal-dialog .grid-container-mobile-lg{\n  margin-left:auto;\n  margin-right:auto;\n  max-width:30rem;\n  padding-left:1rem;\n  padding-right:1rem;\n}\n\n.fba-modal-dialog .grid-container-tablet{\n  margin-left:auto;\n  margin-right:auto;\n  max-width:40rem;\n  padding-left:1rem;\n  padding-right:1rem;\n}\n\n.fba-modal-dialog .grid-container-tablet-lg{\n  margin-left:auto;\n  margin-right:auto;\n  max-width:55rem;\n  padding-left:1rem;\n  padding-right:1rem;\n}\n\n.fba-modal-dialog .grid-container-desktop{\n  margin-left:auto;\n  margin-right:auto;\n  max-width:64rem;\n  padding-left:1rem;\n  padding-right:1rem;\n}\n\n.fba-modal-dialog .grid-container-desktop-lg{\n  margin-left:auto;\n  margin-right:auto;\n  max-width:75rem;\n  padding-left:1rem;\n  padding-right:1rem;\n}\n\n.fba-modal-dialog .grid-container-widescreen{\n  margin-left:auto;\n  margin-right:auto;\n  max-width:87.5rem;\n  padding-left:1rem;\n  padding-right:1rem;\n}\n\n.fba-modal-dialog .grid-row{\n  display:flex;\n  flex-wrap:wrap;\n}\n\n.fba-modal-dialog .grid-row.grid-gap{\n  margin-left:-0.5rem;\n  margin-right:-0.5rem;\n}\n.fba-modal-dialog .grid-row.grid-gap > *{\n  padding-left:0.5rem;\n  padding-right:0.5rem;\n}\n\n.fba-modal-dialog .grid-row.grid-gap-0{\n  margin-left:0;\n  margin-right:0;\n}\n.fba-modal-dialog .grid-row.grid-gap-0 > *{\n  padding-left:0;\n  padding-right:0;\n}\n\n.fba-modal-dialog .grid-row.grid-gap-2px{\n  margin-left:-1px;\n  margin-right:-1px;\n}\n\n.fba-modal-dialog .grid-row.grid-gap-2px > *{\n  padding-left:1px;\n  padding-right:1px;\n}\n\n.fba-modal-dialog .grid-row.grid-gap-05{\n  margin-left:-2px;\n  margin-right:-2px;\n}\n.fba-modal-dialog .grid-row.grid-gap-05 > *{\n  padding-left:2px;\n  padding-right:2px;\n}\n.fba-modal-dialog .grid-row.grid-gap-1{\n  margin-left:-0.25rem;\n  margin-right:-0.25rem;\n}\n.fba-modal-dialog .grid-row.grid-gap-1 > *{\n  padding-left:0.25rem;\n  padding-right:0.25rem;\n}\n.fba-modal-dialog .grid-row.grid-gap-2{\n  margin-left:-0.5rem;\n  margin-right:-0.5rem;\n}\n.fba-modal-dialog .grid-row.grid-gap-2 > *{\n  padding-left:0.5rem;\n  padding-right:0.5rem;\n}\n.fba-modal-dialog .grid-row.grid-gap-3{\n  margin-left:-0.75rem;\n  margin-right:-0.75rem;\n}\n.fba-modal-dialog .grid-row.grid-gap-3 > *{\n  padding-left:0.75rem;\n  padding-right:0.75rem;\n}\n.fba-modal-dialog .grid-row.grid-gap-4{\n  margin-left:-1rem;\n  margin-right:-1rem;\n}\n.fba-modal-dialog .grid-row.grid-gap-4 > *{\n  padding-left:1rem;\n  padding-right:1rem;\n}\n.fba-modal-dialog .grid-row.grid-gap-5{\n  margin-left:-1.25rem;\n  margin-right:-1.25rem;\n}\n.fba-modal-dialog .grid-row.grid-gap-5 > *{\n  padding-left:1.25rem;\n  padding-right:1.25rem;\n}\n.fba-modal-dialog .grid-row.grid-gap-6{\n  margin-left:-1.5rem;\n  margin-right:-1.5rem;\n}\n.fba-modal-dialog .grid-row.grid-gap-6 > *{\n  padding-left:1.5rem;\n  padding-right:1.5rem;\n}\n.fba-modal-dialog .grid-row.grid-gap-sm{\n  margin-left:-1px;\n  margin-right:-1px;\n}\n.fba-modal-dialog .grid-row.grid-gap-sm > *{\n  padding-left:1px;\n  padding-right:1px;\n}\n.fba-modal-dialog .grid-row.grid-gap-md{\n  margin-left:-0.5rem;\n  margin-right:-0.5rem;\n}\n.fba-modal-dialog .grid-row.grid-gap-md > *{\n  padding-left:0.5rem;\n  padding-right:0.5rem;\n}\n.fba-modal-dialog .grid-row.grid-gap-lg{\n  margin-left:-0.75rem;\n  margin-right:-0.75rem;\n}\n.fba-modal-dialog .grid-row.grid-gap-lg > *{\n  padding-left:0.75rem;\n  padding-right:0.75rem;\n}\n\n.fba-modal-dialog [class*=grid-col]{\n  position:relative;\n  width:100%;\n  box-sizing:border-box;\n}\n\n.fba-modal-dialog .grid-col{\n  flex:1 1 0%;\n  width:auto;\n  max-width:100%;\n  min-width:1px;\n  max-width:100%;\n}\n\n.fba-modal-dialog .grid-col-auto{\n  flex:0 1 auto;\n  width:auto;\n  max-width:100%;\n}\n\n.fba-modal-dialog .grid-col-fill{\n  flex:1 1 0%;\n  width:auto;\n  max-width:100%;\n  min-width:1px;\n}\n\n.fba-modal-dialog .grid-col-1{\n  flex:0 1 auto;\n  width:8.3333333333%;\n}\n\n.fba-modal-dialog .grid-col-2{\n  flex:0 1 auto;\n  width:16.6666666667%;\n}\n\n.fba-modal-dialog .grid-col-3{\n  flex:0 1 auto;\n  width:25%;\n}\n\n.fba-modal-dialog .grid-col-4{\n  flex:0 1 auto;\n  width:33.3333333333%;\n}\n\n.fba-modal-dialog .grid-col-5{\n  flex:0 1 auto;\n  width:41.6666666667%;\n}\n\n.fba-modal-dialog .grid-col-6{\n  flex:0 1 auto;\n  width:50%;\n}\n\n.fba-modal-dialog .grid-col-7{\n  flex:0 1 auto;\n  width:58.3333333333%;\n}\n\n.fba-modal-dialog .grid-col-8{\n  flex:0 1 auto;\n  width:66.6666666667%;\n}\n\n.fba-modal-dialog .grid-col-9{\n  flex:0 1 auto;\n  width:75%;\n}\n\n.fba-modal-dialog .grid-col-10{\n  flex:0 1 auto;\n  width:83.3333333333%;\n}\n\n.fba-modal-dialog .grid-col-11{\n  flex:0 1 auto;\n  width:91.6666666667%;\n}\n\n.fba-modal-dialog .grid-col-12{\n  flex:0 1 auto;\n  width:100%;\n}\n\n.fba-modal-dialog .grid-offset-1{\n  margin-left:8.3333333333%;\n}\n\n.fba-modal-dialog .grid-offset-2{\n  margin-left:16.6666666667%;\n}\n\n.fba-modal-dialog .grid-offset-3{\n  margin-left:25%;\n}\n\n.fba-modal-dialog .grid-offset-4{\n  margin-left:33.33333%;\n}\n\n.fba-modal-dialog .grid-offset-5{\n  margin-left:41.6666666667%;\n}\n\n.fba-modal-dialog .grid-offset-6{\n  margin-left:50%;\n}\n\n.fba-modal-dialog .grid-offset-7{\n  margin-left:58.3333333333%;\n}\n\n.fba-modal-dialog .grid-offset-8{\n  margin-left:66.6666666667%;\n}\n\n.fba-modal-dialog .grid-offset-9{\n  margin-left:75%;\n}\n\n.fba-modal-dialog .grid-offset-10{\n  margin-left:83.3333333333%;\n}\n\n.fba-modal-dialog .grid-offset-11{\n  margin-left:91.6666666667%;\n}\n\n.fba-modal-dialog .grid-offset-12{\n  margin-left:100%;\n}\n\n.fba-modal-dialog .grid-offset-none{\n  margin-left:0;\n}\n\n.fba-modal-dialog .usa-paragraph{\n  line-height:1.5;\n  margin-bottom:0;\n  margin-top:0;\n  max-width:68ex;\n}\n\n* + .fba-modal-dialog .usa-paragraph{\n  margin-top:1em;\n}\n\n.fba-modal-dialog .usa-paragraph + *{\n  margin-top:1em;\n}\n\n.fba-modal-dialog .usa-content p{\n  max-width:68ex;\n}\n\n.fba-modal-dialog .usa-display{\n  margin-bottom:0;\n  margin-top:0;\n  clear:both;\n  font-family:Merriweather Web, Georgia, Cambria, Times New Roman, Times, serif;\n  font-size:2.44rem;\n  line-height:1.2;\n  font-weight:bold;\n}\n\n* + .fba-modal-dialog .usa-display{\n  margin-top:1.5em;\n}\n\n.fba-modal-dialog .usa-display + *{\n  margin-top:1em;\n}\n@media all and (min-width: 30em){\n  .fba-modal-dialog .usa-display{\n    margin-bottom:0;\n    margin-top:0;\n    clear:both;\n    font-family:Merriweather Web, Georgia, Cambria, Times New Roman, Times, serif;\n    font-size:2.44rem;\n    line-height:1.2;\n    font-weight:bold;\n  }\n  .fba-modal-dialog + .usa-display{\n    margin-top:1.5em;\n  }\n  .fba-modal-dialog .usa-display + *{\n    margin-top:1em;\n  }\n}\n@media all and (min-width: 40em){\n  .fba-modal-dialog .usa-display{\n    margin-bottom:0;\n    margin-top:0;\n    clear:both;\n    font-family:Merriweather Web, Georgia, Cambria, Times New Roman, Times, serif;\n    font-size:2.93rem;\n    line-height:1.2;\n    font-weight:bold;\n  }\n  .fba-modal-dialog + .usa-display{\n    margin-top:1.5em;\n  }\n  .fba-modal-dialog .usa-display + *{\n    margin-top:1em;\n  }\n}\n\n.fba-modal-dialog .usa-dark-background{\n  -moz-osx-font-smoothing:grayscale;\n  -webkit-font-smoothing:antialiased;\n  background-color:#3d4551;\n}\n\n.fba-modal-dialog .usa-dark-background p,\n.fba-modal-dialog .usa-dark-background span{\n  color:white;\n}\n\n.fba-modal-dialog .usa-dark-background a{\n  color:#dfe1e2;\n}\n\n.fba-modal-dialog .usa-dark-background a:hover{\n  color:white;\n}\n\n.fba-modal-dialog .usa-overlay{\n  position:absolute;\n  bottom:0;\n  left:0;\n  right:0;\n  top:0;\n  position:fixed;\n  background:black;\n  opacity:0;\n  transition:opacity 0.2s ease-in-out;\n  visibility:hidden;\n  z-index:400;\n}\n\n.fba-modal-dialog .usa-overlay.is-visible{\n  opacity:0.2;\n  visibility:visible;\n}\n\n.fba-modal-dialog .usa-layout-docs__sidenav{\n  order:2;\n  padding-top:2rem;\n}\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-layout-docs__sidenav{\n    padding-top:0;\n  }\n}\n\n@media all and (min-width: 64em){\n  .fba-modal-dialog .usa-layout-docs__main{\n    order:2;\n  }\n}\n.fba-modal-dialog .usa-media-block{\n  align-items:flex-start;\n  display:flex;\n}\n.fba-modal-dialog .usa-media-block__img{\n  float:left;\n  margin-right:0.5rem;\n}\n\n.fba-modal-dialog .usa-media-block__body{\n  flex:1 1 0%;\n}\n\n.fba-modal-dialog .usa-js-mobile-nav--active{\n  overflow:hidden;\n}\n\n/* TODO Custom */\n@media all and (min-width: 40em){\n  .fba-modal-dialog .grid-row.tablet\\:grid-gap-0{\n    margin-left:0;\n    margin-right:0;\n  }\n  .fba-modal-dialog .grid-row.tablet\\:grid-gap-0 > *{\n    padding-left:0;\n    padding-right:0;\n  }\n  .fba-modal-dialog .grid-row.tablet\\:grid-gap-2px{\n    margin-left:-1px;\n    margin-right:-1px;\n  }\n  .fba-modal-dialog .grid-row.tablet\\:grid-gap-2px > *{\n    padding-left:1px;\n    padding-right:1px;\n  }\n  .fba-modal-dialog .grid-row.tablet\\:grid-gap-05{\n    margin-left:-2px;\n    margin-right:-2px;\n  }\n  .fba-modal-dialog .grid-row.tablet\\:grid-gap-05 > *{\n    padding-left:2px;\n    padding-right:2px;\n  }\n  .fba-modal-dialog .grid-row.tablet\\:grid-gap-1{\n    margin-left:-0.25rem;\n    margin-right:-0.25rem;\n  }\n  .fba-modal-dialog .grid-row.tablet\\:grid-gap-1 > *{\n    padding-left:0.25rem;\n    padding-right:0.25rem;\n  }\n  .fba-modal-dialog .grid-row.tablet\\:grid-gap-2{\n    margin-left:-0.5rem;\n    margin-right:-0.5rem;\n  }\n  .fba-modal-dialog .grid-row.tablet\\:grid-gap-2 > *{\n    padding-left:0.5rem;\n    padding-right:0.5rem;\n  }\n  .fba-modal-dialog .grid-row.tablet\\:grid-gap-3{\n    margin-left:-0.75rem;\n    margin-right:-0.75rem;\n  }\n  .fba-modal-dialog .grid-row.tablet\\:grid-gap-3 > *{\n    padding-left:0.75rem;\n    padding-right:0.75rem;\n  }\n  .fba-modal-dialog .grid-row.tablet\\:grid-gap-4{\n    margin-left:-1rem;\n    margin-right:-1rem;\n  }\n  .fba-modal-dialog .grid-row.tablet\\:grid-gap-4 > *{\n    padding-left:1rem;\n    padding-right:1rem;\n  }\n  .fba-modal-dialog .grid-row.tablet\\:grid-gap-5{\n    margin-left:-1.25rem;\n    margin-right:-1.25rem;\n  }\n  .fba-modal-dialog .grid-row.tablet\\:grid-gap-5 > *{\n    padding-left:1.25rem;\n    padding-right:1.25rem;\n  }\n  .fba-modal-dialog .grid-row.tablet\\:grid-gap-6{\n    margin-left:-1.5rem;\n    margin-right:-1.5rem;\n  }\n  .fba-modal-dialog .grid-row.tablet\\:grid-gap-6 > *{\n    padding-left:1.5rem;\n    padding-right:1.5rem;\n  }\n  .fba-modal-dialog .grid-row.tablet\\:grid-gap-sm{\n    margin-left:-1px;\n    margin-right:-1px;\n  }\n  .fba-modal-dialog .grid-row.tablet\\:grid-gap-sm > *{\n    padding-left:1px;\n    padding-right:1px;\n  }\n  .fba-modal-dialog .grid-row.tablet\\:grid-gap-md{\n    margin-left:-0.5rem;\n    margin-right:-0.5rem;\n  }\n  .fba-modal-dialog .grid-row.tablet\\:grid-gap-md > *{\n    padding-left:0.5rem;\n    padding-right:0.5rem;\n  }\n  .fba-modal-dialog .grid-row.tablet\\:grid-gap-lg{\n    margin-left:-0.75rem;\n    margin-right:-0.75rem;\n  }\n  .fba-modal-dialog .grid-row.tablet\\:grid-gap-lg > *{\n    padding-left:0.75rem;\n    padding-right:0.75rem;\n  }\n}\n\n\n\n.fba-modal-dialog .usa-graphic-list .fba-modal-dialog .usa-graphic-list__row .fba-modal-dialog .usa-media-block{\n  margin-bottom:4rem;\n}\n.fba-modal-dialog .usa-graphic-list .fba-modal-dialog .usa-graphic-list__row:last-child .fba-modal-dialog .usa-media-block{\n  margin-bottom:0;\n}\n.fba-modal-dialog .usa-section{\n  padding-bottom:4rem;\n  padding-top:4rem;\n}\n.fba-modal-dialog .usa-sidenav .fba-modal-dialog .usa-current{\n  position:relative;\n}\n.fba-modal-dialog .usa-sidenav .fba-modal-dialog .usa-current::after{\n  background-color:#005ea2;\n  border-radius:99rem;\n  content:\'\';\n  display:block;\n  position:absolute;\n  bottom:0.25rem;\n  top:0.25rem;\n  width:0.25rem;\n  left:0;\n}\n.fba-modal-dialog .grid-container .fba-modal-dialog .usa-sidenav{\n  margin-left:0;\n  margin-right:0;\n}\n.fba-modal-dialog .usa-sidenav__sublist .fba-modal-dialog .usa-current::after{\n  display:none;\n}\n.fba-modal-dialog .grid-row.fba-modal-dialog .grid-gap{\n  margin-left:-1rem;\n  margin-right:-1rem;\n}\n.fba-modal-dialog .grid-row.fba-modal-dialog .grid-gap > *{\n  padding-left:1rem;\n  padding-right:1rem;\n}\n.fba-modal-dialog .grid-row.desktop\\:grid-gap-0{\n  margin-left:0;\n  margin-right:0;\n}\n.fba-modal-dialog .grid-row.desktop\\:grid-gap-0 > *{\n  padding-left:0;\n  padding-right:0;\n}\n.fba-modal-dialog .grid-row.desktop\\:grid-gap-2px{\n  margin-left:-1px;\n  margin-right:-1px;\n}\n.fba-modal-dialog .grid-row.desktop\\:grid-gap-2px > *{\n  padding-left:1px;\n  padding-right:1px;\n}\n.fba-modal-dialog .grid-row.desktop\\:grid-gap-05{\n  margin-left:-2px;\n  margin-right:-2px;\n}\n.fba-modal-dialog .grid-row.desktop\\:grid-gap-05 > *{\n  padding-left:2px;\n  padding-right:2px;\n}\n.fba-modal-dialog .grid-row.desktop\\:grid-gap-1{\n  margin-left:-0.25rem;\n  margin-right:-0.25rem;\n}\n.fba-modal-dialog .grid-row.desktop\\:grid-gap-1 > *{\n  padding-left:0.25rem;\n  padding-right:0.25rem;\n}\n.fba-modal-dialog .grid-row.desktop\\:grid-gap-2{\n  margin-left:-0.5rem;\n  margin-right:-0.5rem;\n}\n.fba-modal-dialog .grid-row.desktop\\:grid-gap-2 > *{\n  padding-left:0.5rem;\n  padding-right:0.5rem;\n}\n.fba-modal-dialog .grid-row.desktop\\:grid-gap-3{\n  margin-left:-0.75rem;\n  margin-right:-0.75rem;\n}\n.fba-modal-dialog .grid-row.desktop\\:grid-gap-3 > *{\n  padding-left:0.75rem;\n  padding-right:0.75rem;\n}\n.fba-modal-dialog .grid-row.desktop\\:grid-gap-4{\n  margin-left:-1rem;\n  margin-right:-1rem;\n}\n.fba-modal-dialog .grid-row.desktop\\:grid-gap-4 > *{\n  padding-left:1rem;\n  padding-right:1rem;\n}\n.fba-modal-dialog .grid-row.desktop\\:grid-gap-5{\n  margin-left:-1.25rem;\n  margin-right:-1.25rem;\n}\n.fba-modal-dialog .grid-row.desktop\\:grid-gap-5 > *{\n  padding-left:1.25rem;\n  padding-right:1.25rem;\n}\n.fba-modal-dialog .grid-row.desktop\\:grid-gap-6{\n  margin-left:-1.5rem;\n  margin-right:-1.5rem;\n}\n.fba-modal-dialog .grid-row.desktop\\:grid-gap-6 > *{\n  padding-left:1.5rem;\n  padding-right:1.5rem;\n}\n.fba-modal-dialog .grid-row.desktop\\:grid-gap-sm{\n  margin-left:-1px;\n  margin-right:-1px;\n}\n.fba-modal-dialog .grid-row.desktop\\:grid-gap-sm > *{\n  padding-left:1px;\n  padding-right:1px;\n}\n.fba-modal-dialog .grid-row.desktop\\:grid-gap-md{\n  margin-left:-0.5rem;\n  margin-right:-0.5rem;\n}\n.fba-modal-dialog .grid-row.desktop\\:grid-gap-md > *{\n  padding-left:0.5rem;\n  padding-right:0.5rem;\n}\n.fba-modal-dialog .grid-row.desktop\\:grid-gap-lg{\n  margin-left:-0.75rem;\n  margin-right:-0.75rem;\n}\n.fba-modal-dialog .grid-row.desktop\\:grid-gap-lg > *{\n  padding-left:0.75rem;\n  padding-right:0.75rem;\n}\n.fba-modal-dialog .usa-layout-docs__sidenav{\n  padding-top:0;\n}\n.fba-modal-dialog .usa-layout-docs__main{\n  -webkit-box-ordinal-group:3;\n      -ms-flex-order:2;\n          order:2;\n}\n.fba-modal-dialog .usa-nav{\n  float:right;\n  position:relative;\n}\n.fba-modal-dialog .usa-nav .fba-modal-dialog .usa-search{\n  margin-left:1rem;\n}\n.fba-modal-dialog .usa-nav__secondary{\n  bottom:4rem;\n  font-size:0.93162rem;\n  margin-top:0.5rem;\n  min-width:calc(27ch + 3rem);\n  position:absolute;\n  right:2rem;\n}\n.fba-modal-dialog .usa-nav__secondary .fba-modal-dialog .usa-search{\n  margin-left:0;\n  margin-top:0.5rem;\n}\n.fba-modal-dialog .usa-nav__secondary-links{\n  float:right;\n  line-height:0.93923;\n  margin-bottom:0.25rem;\n  margin-top:0;\n}\n.fba-modal-dialog .usa-nav__secondary-links .fba-modal-dialog .usa-nav__secondary-item{\n  display:inline;\n  padding-left:0.25rem;\n}\n.fba-modal-dialog .usa-nav__secondary-links .fba-modal-dialog .usa-nav__secondary-item + .fba-modal-dialog .usa-nav__secondary-item::before{\n  color:#dcdee0;\n  content:\'|\';\n  padding-right:0.25rem;\n}\n.fba-modal-dialog .usa-nav__close{\n  display:none;\n}\n\n/* TP-795 disable uswds v1 overrides */\n.fba-modal-dialog .usa-label,\n.fba-modal-dialog .usa-label-big {\n  background-color: inherit;\n  border-radius: inherit;\n  color: inherit;\n  margin-right: inherit;\n  padding: inherit;\n  text-transform: inherit;\n}\n\n@media all and  (min-width: 30em) {\n  .fba-modal-dialog .usa-button {\n    width: auto;\n  }\n}\n\n.star_rating svg {\n	width: 1em;\n	height: 1em;\n	fill: currentColor;\n	stroke: currentColor;\n}\n.star_rating label, .star_rating output {\n	display: block;\n	float: left;\n	font-size: 2em;\n	height: 1.2em;\n	color: #036;\n	cursor: pointer;\n	/* Transparent border-bottom avoids jumping\n	   when a colored border is applied\n		 on :hover/:focus */\n	border-bottom: 2px solid transparent;\n}\n.star_rating output {\n	font-size: 1.5em;\n	padding: 0 1em;\n}\n.star_rating input:checked ~ label {\n	color: #999;\n}\n.star_rating input:checked + label {\n	color: #036;\n	border-bottom-color: #036;\n}\n.star_rating input:focus + label {\n	border-bottom-style: dotted;\n}\n.star_rating:hover input + label {\n	color: #036;\n}\n.star_rating input:hover ~ label,\n.star_rating input:focus ~ label,\n.star_rating input[id=\"star0\"] + label {\n	color: #999;\n}\n.star_rating input:hover + label,\n.star_rating input:focus + label {\n	color: #036;\n}\n.star_rating input[id=\"star0\"]:checked + label {\n	color: #ff2d21;\n}\n\n/*! from USWDS  uswds v2.9.0 */\n#fba-button.usa-button{\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:1.06rem;\n  line-height:0.9;\n  -moz-osx-font-smoothing:grayscale;\n  -webkit-font-smoothing:antialiased;\n  color:white;\n  background-color:#005ea2;\n  -webkit-appearance:none;\n     -moz-appearance:none;\n          appearance:none;\n  border:0;\n  border-radius:0.25rem;\n  cursor:pointer;\n  display:inline-block;\n  font-weight:bold;\n  margin-right:0.5rem;\n  padding:0.75rem 1.25rem;\n  text-align:center;\n  text-decoration:none;\n  border-bottom-left-radius: 0;\n  border-bottom-right-radius: 0\n}\n\n.usa-skipnav.touchpoints-skipnav{\n  font-family:Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;\n  font-size:1.06rem;\n  line-height:1.5;\n  color:#005ea2;\n  text-decoration:underline;\n  background:transparent;\n  left:0;\n  padding:0.5rem 1rem;\n  position:absolute;\n  top:-3.8rem;\n  transition:0.15s ease-in-out;\n  z-index:100;\n}\n.usa-skipnav.touchpoints-skipnav:visited{\n  color:#54278f;\n}\n.usa-skipnav.touchpoints-skipnav:hover{\n  color:#1a4480;\n}\n.usa-skipnav.touchpoints-skipnav:active{\n  color:#162e51;\n}\n.usa-skipnav.touchpoints-skipnav:focus{\n  outline:0.25rem solid #2491ff;\n  outline-offset:0;\n}\n.usa-skipnav.touchpoints-skipnav:focus{\n  background:white;\n  left:0;\n  position:absolute;\n  top:0;\n  transition:0.2s ease-in-out;\n}\n\n.fba-modal-dialog abbr[title=required]{\n  text-decoration:none;\n}\n\n/* Override */\n.fba-modal-dialog .usa-form {\n  max-width: inherit;\n}\n\n/* Custom */\n.touchpoints-form-wrapper .usa-banner {\n  margin-top: 10px;\n}\n\n.usa-banner__header.touchpoints-footer-banner {\n  min-height: 0;\n}\n\n.fba-modal-dialog .question-options.big-thumbs .usa-radio__label::before {\n  display: none;\n}\n\n/* Same max-width as texarea */\n.touchpoints-form-body .big-thumbs {\n  max-width: 35rem;\n}\n\n.question-options.big-thumbs .usa-radio__input--tile+.usa-radio__label {\n  color: #005ea2;\n  padding-left: 1rem;\n}\n\n.touchpoint-form .question-options {\n  clear: both;\n}\n\n.touchpoint-form {\n  max-width: 35em;\n  margin-left: auto;\n  margin-right: auto;\n}\n\n.fba-modal-dialog .margin-top-3{\n  margin-top:1.5rem;\n}\n\n/* Override */\n.touchpoint-form .usa-form--large {\n  max-width: 35rem;\n}\n\n.fba-modal-dialog .usa-sr-only{\n  position:absolute;\n  left:-999em;\n  right:auto;\n}\n\n/* big thumbs up down buttons */\n.fba-modal-dialog .usa-icon{\n  display:inline-block;\n  fill:currentColor;\n  height:1em;\n  position:relative;\n  width:1em;\n}\n\n.fba-modal-dialog .margin-top-2 {\n  margin-top:1rem;\n}\n\n.fba-modal-dialog .text-center{\n  text-align:center;\n}\n\n.fba-modal-dialog .font-sans-3xl{\n  font-size:3.19rem;\n}\n\n.fba-modal-dialog .margin-bottom-2 {\n  margin-bottom:1rem;\n}\n\n.fba-modal-dialog .margin-bottom-3 {\n  margin-top:1.5rem;\n}\n\n.fba-modal-dialog .text-right{\n  text-align:right;\n}\n\n.fba-modal-dialog .text-bold{\n  font-weight:700;\n}\n\n.fba-modal-dialog .usa-button .margin-top-0{\n  margin-top:0;\n}\n\n.fba-modal-dialog .previous-section.usa-button{\n  margin-top:0;\n}\n\n.fba-modal-dialog .border-0{\n  border:0 solid;\n}\n\n.fba-modal-dialog .border-gray-10{\n  border-color:#e6e6e6;\n}\n\n.fba-modal-dialog .border-top{\n  border-top:1px solid;\n}\n\n.fba-modal-dialog .display-none{\n  display:none;\n}",
	'loadCSS' : true,
	'formSpecificScript' : function() {
	},
	'deliveryMethod' : "modal",
	'successTextHeading' : "Success",
	'successText' : "Thank you. Your feedback has been received.",
	'questionParams' : function(form) {
		return {
			answer_01 : form.querySelector("input[name=question_45234_answer_01]:checked") && form.querySelector("input[name=question_45234_answer_01]:checked").value,
			answer_02 : form.querySelector("input[name=question_45235_answer_02]:checked") && form.querySelector("input[name=question_45235_answer_02]:checked").value,
			answer_03 : form.querySelector("input[name=question_45236_answer_03]:checked") && form.querySelector("input[name=question_45236_answer_03]:checked").value,
			answer_04 : form.querySelector("#question_45831_answer_04") && form.querySelector("#question_45831_answer_04").value,
			answer_05 : form.querySelector("input[name=question_45239_answer_05]:checked") && form.querySelector("input[name=question_45239_answer_05]:checked").value,
			answer_06 : form.querySelector("#question_45758_answer_06") && form.querySelector("#question_45758_answer_06").value,
			answer_07 : form.querySelector("#question_45470_answer_07") && form.querySelector("#question_45470_answer_07").value,
			answer_08 : form.querySelector("#question_45830_answer_08") && form.querySelector("#question_45830_answer_08").value,
			answer_09 : form.querySelector("input[name=question_45241_answer_09]:checked") && Array.apply(null,form.querySelectorAll("input[name=question_45241_answer_09]:checked")).map(function(x) {return x.value;}).join(','),
			answer_10 : form.querySelector("#question_47553_answer_10") && form.querySelector("#question_47553_answer_10").value,
		}
	},
	'suppressUI' : false,
	'suppressSubmitButton' : false,
	'htmlFormBody' : function() {
		return "<div\n  class=\"fba-modal-dialog\"\n  role=\"dialog\"\n  aria-label=\"Feedback modal dialog\"\n  aria-labelledby=\"fba-modal-title\"\n  aria-modal=\"true\">\n  <div\n  class=\"touchpoints-form-wrapper \"\n  id=\"touchpoints-form-89426825\"\n  data-touchpoints-form-id=\"89426825\">\n  <div class=\"wrapper\">\n      <a class=\"fba-modal-close\"\n        type=\"button\"\n        href=\"#\"\n        aria-label=\"Close this window\">×<\/a>\n    <h2 class=\"word-break fba-modal-title\">\n  <div class=\"margin-bottom-2 text-center\">\n      <img alt=\"National Oceanic and Atmospheric Administration logo\" class=\"form-header-logo-square\" src=\"https://cg-1b082c1b-3db7-477f-9ca5-bd51a786b41e.s3-us-gov-west-1.amazonaws.com/uploads/form/logo/3874/logo_square_NOAA-logo.jpg\" />\n  <\/div>\n  NCEI Customer Experience Feedback\n<\/h2>\n\n    <div class=\"fba-instructions\">\n      <p>This survey is designed to measure your level of satisfaction with <a href=\"https://www.ncei.noaa.gov/\">ncei.noaa.gov<\/a>. It consists of nine questions and should take approximately two to five minutes to complete. <\/p>\n\n<p>You can also help improve our  site\'s navigation by taking our <a href=\"https://s2.userzoom.com/m/NyBDNjgyOVM0MyAg\"> usability test<\/a>.<\/p>\n\n<p>If you have comments concerning the accessibility of our website, please submit your feedback on our <a href=\"https://www.ncei.noaa.gov/accessibility\">accessibility page<\/a>.<\/p>\n    <\/div>\n    <p class=\"required-questions-notice\">\n      <small>\n        A red asterisk (<abbr title=\"required\" class=\"usa-hint--required\">*<\/abbr>) indicates a required field.\n      <\/small>\n    <\/p>\n    <div class=\"fba-alert usa-alert usa-alert--success\" role=\"status\" hidden>\n  <div class=\"usa-alert__body\">\n    <h3 class=\"usa-alert__heading\">\n      Success\n    <\/h3>\n    <div class=\"usa-alert__text\">\n      Thank you. Your feedback has been received.\n    <\/div>\n  <\/div>\n<\/div>\n<div class=\"fba-alert-error usa-alert usa-alert--error\" role=\"alert\" hidden>\n  <div class=\"usa-alert__body\">\n    <h3 class=\"usa-alert__heading\">\n      Error\n    <\/h3>\n    <p class=\"usa-alert__text\">\n      alert message\n    <\/p>\n  <\/div>\n<\/div>\n\n    \n<form\n  action=\"https://touchpoints.app.cloud.gov/touchpoints/89426825/submissions.json\"\n  class=\"usa-form usa-form--large margin-bottom-2\"\n  method=\"POST\">\n  <div class=\"touchpoints-form-body\">\n        <input type=\"hidden\" name=\"fba_location_code\" id=\"fba_location_code\" autocomplete=\"off\" />\n    <input type=\"text\"\n      name=\"fba_directive\"\n      id=\"fba_directive\"\n      class=\"display-none\"\n      title=\"fba_directive\"\n      aria-hidden=\"true\"\n      tabindex=\"-1\"\n      autocomplete=\"off\">\n      <div class=\"section visible\">\n\n\n\n        <div class=\"questions\">\n\n          <div class=\"question white-bg\"\n            id=\"question_45234\">\n              <fieldset class=\"usa-fieldset radios margin-top-3\">\n  <legend class=\"usa-legend\" id=\"question-label-45234\">\n  It was easy to complete what I needed to do.\n  <abbr title=\"required\" class=\"usa-hint--required\">*<\/abbr>\n<\/legend>\n\n  <div class=\"question-options\">\n    <div class=\"radio-button usa-radio question-option\"\n      data-id=\"49957\"\n    >\n      <input type=\"radio\" name=\"question_45234_answer_01\" id=\"question_option_49957\" value=\"Yes\" class=\"usa-radio__input usa-radio__input--tile\" required=\"required\" />\n      <label class=\"usa-radio__label\" for=\"question_option_49957\">👍 Yes<\/label>\n    <\/div>\n    <div class=\"radio-button usa-radio question-option\"\n      data-id=\"49958\"\n    >\n      <input type=\"radio\" name=\"question_45234_answer_01\" id=\"question_option_49958\" value=\"No\" class=\"usa-radio__input usa-radio__input--tile\" required=\"required\" />\n      <label class=\"usa-radio__label\" for=\"question_option_49958\">👎 No<\/label>\n    <\/div>\n  <\/div>\n<\/fieldset>\n\n          <\/div>\n\n          <div class=\"question white-bg\"\n            id=\"question_45235\">\n              <fieldset class=\"usa-fieldset radios margin-top-3\">\n  <legend class=\"usa-legend\" id=\"question-label-45235\">\n  It took a reasonable amount of time to do what I needed to do.\n  <abbr title=\"required\" class=\"usa-hint--required\">*<\/abbr>\n  <div\n    id=\"question-id-45235-help-text\"\n    class=\"help-text margin-top-1\"\n  >\n    <small>\n      Select one\n    <\/small>\n  <\/div>\n<\/legend>\n\n  <div class=\"question-options\">\n    <div class=\"radio-button usa-radio question-option\"\n      data-id=\"49959\"\n      aria-describedby=\"question-id-45235-help-text\"\n    >\n      <input type=\"radio\" name=\"question_45235_answer_02\" id=\"question_option_49959\" value=\"Strongly Disagree\" class=\"usa-radio__input usa-radio__input--tile\" required=\"required\" />\n      <label class=\"usa-radio__label\" for=\"question_option_49959\">Strongly Disagree<\/label>\n    <\/div>\n    <div class=\"radio-button usa-radio question-option\"\n      data-id=\"49960\"\n      aria-describedby=\"question-id-45235-help-text\"\n    >\n      <input type=\"radio\" name=\"question_45235_answer_02\" id=\"question_option_49960\" value=\"Disagree\" class=\"usa-radio__input usa-radio__input--tile\" required=\"required\" />\n      <label class=\"usa-radio__label\" for=\"question_option_49960\">Disagree<\/label>\n    <\/div>\n    <div class=\"radio-button usa-radio question-option\"\n      data-id=\"49961\"\n      aria-describedby=\"question-id-45235-help-text\"\n    >\n      <input type=\"radio\" name=\"question_45235_answer_02\" id=\"question_option_49961\" value=\"Neutral\" class=\"usa-radio__input usa-radio__input--tile\" required=\"required\" />\n      <label class=\"usa-radio__label\" for=\"question_option_49961\">Neutral<\/label>\n    <\/div>\n    <div class=\"radio-button usa-radio question-option\"\n      data-id=\"49962\"\n      aria-describedby=\"question-id-45235-help-text\"\n    >\n      <input type=\"radio\" name=\"question_45235_answer_02\" id=\"question_option_49962\" value=\"Agree\" class=\"usa-radio__input usa-radio__input--tile\" required=\"required\" />\n      <label class=\"usa-radio__label\" for=\"question_option_49962\">Agree<\/label>\n    <\/div>\n    <div class=\"radio-button usa-radio question-option\"\n      data-id=\"49963\"\n      aria-describedby=\"question-id-45235-help-text\"\n    >\n      <input type=\"radio\" name=\"question_45235_answer_02\" id=\"question_option_49963\" value=\"Strongly Agree\" class=\"usa-radio__input usa-radio__input--tile\" required=\"required\" />\n      <label class=\"usa-radio__label\" for=\"question_option_49963\">Strongly Agree<\/label>\n    <\/div>\n  <\/div>\n<\/fieldset>\n\n          <\/div>\n\n          <div class=\"question white-bg\"\n            id=\"question_45236\">\n              <fieldset class=\"usa-fieldset radios margin-top-3\">\n  <legend class=\"usa-legend\" id=\"question-label-45236\">\n  I am satisfied with the information/service I received from NCEI.\n  <abbr title=\"required\" class=\"usa-hint--required\">*<\/abbr>\n  <div\n    id=\"question-id-45236-help-text\"\n    class=\"help-text margin-top-1\"\n  >\n    <small>\n      Select one\n    <\/small>\n  <\/div>\n<\/legend>\n\n  <div class=\"question-options\">\n    <div class=\"radio-button usa-radio question-option\"\n      data-id=\"49964\"\n      aria-describedby=\"question-id-45236-help-text\"\n    >\n      <input type=\"radio\" name=\"question_45236_answer_03\" id=\"question_option_49964\" value=\"Strongly Disagree\" class=\"usa-radio__input usa-radio__input--tile\" required=\"required\" />\n      <label class=\"usa-radio__label\" for=\"question_option_49964\">Strongly Disagree<\/label>\n    <\/div>\n    <div class=\"radio-button usa-radio question-option\"\n      data-id=\"49965\"\n      aria-describedby=\"question-id-45236-help-text\"\n    >\n      <input type=\"radio\" name=\"question_45236_answer_03\" id=\"question_option_49965\" value=\"Disagree\" class=\"usa-radio__input usa-radio__input--tile\" required=\"required\" />\n      <label class=\"usa-radio__label\" for=\"question_option_49965\">Disagree<\/label>\n    <\/div>\n    <div class=\"radio-button usa-radio question-option\"\n      data-id=\"49966\"\n      aria-describedby=\"question-id-45236-help-text\"\n    >\n      <input type=\"radio\" name=\"question_45236_answer_03\" id=\"question_option_49966\" value=\"Neutral\" class=\"usa-radio__input usa-radio__input--tile\" required=\"required\" />\n      <label class=\"usa-radio__label\" for=\"question_option_49966\">Neutral<\/label>\n    <\/div>\n    <div class=\"radio-button usa-radio question-option\"\n      data-id=\"49967\"\n      aria-describedby=\"question-id-45236-help-text\"\n    >\n      <input type=\"radio\" name=\"question_45236_answer_03\" id=\"question_option_49967\" value=\"Agree\" class=\"usa-radio__input usa-radio__input--tile\" required=\"required\" />\n      <label class=\"usa-radio__label\" for=\"question_option_49967\">Agree<\/label>\n    <\/div>\n    <div class=\"radio-button usa-radio question-option\"\n      data-id=\"49968\"\n      aria-describedby=\"question-id-45236-help-text\"\n    >\n      <input type=\"radio\" name=\"question_45236_answer_03\" id=\"question_option_49968\" value=\"Strongly Agree\" class=\"usa-radio__input usa-radio__input--tile\" required=\"required\" />\n      <label class=\"usa-radio__label\" for=\"question_option_49968\">Strongly Agree<\/label>\n    <\/div>\n  <\/div>\n<\/fieldset>\n\n          <\/div>\n\n          <div class=\"question white-bg\"\n            id=\"question_45831\">\n              \n<div role=\"group\">\n  <label class=\"usa-label\" for=\"question_45831_answer_04\">\n  To help us address your feedback, please share the web address/link (URL) of a page that you are referring to.\n  <div\n    id=\"question-id-45831-help-text\"\n    class=\"help-text margin-top-1\"\n  >\n    <small>\n      Paste link below:\n    <\/small>\n  <\/div>\n<\/label>\n\n  <input type=\"text\" name=\"question_45831_answer_04\" id=\"question_45831_answer_04\" class=\"usa-input\" maxlength=\"10000\" aria-describedby=\"question-id-45831-help-text\" />\n\n<\/div>\n\n          <\/div>\n\n          <div class=\"question white-bg\"\n            id=\"question_45239\">\n              <fieldset class=\"usa-fieldset radios margin-top-3\">\n  <legend class=\"usa-legend\" id=\"question-label-45239\">\n  This site is well organized\n  <abbr title=\"required\" class=\"usa-hint--required\">*<\/abbr>\n  <div\n    id=\"question-id-45239-help-text\"\n    class=\"help-text margin-top-1\"\n  >\n    <small>\n      Select one\n    <\/small>\n  <\/div>\n<\/legend>\n\n  <div class=\"question-options\">\n    <div class=\"radio-button usa-radio question-option\"\n      data-id=\"50466\"\n      aria-describedby=\"question-id-45239-help-text\"\n    >\n      <input type=\"radio\" name=\"question_45239_answer_05\" id=\"question_option_50466\" value=\"Strongly Disagree\" class=\"usa-radio__input usa-radio__input--tile\" required=\"required\" />\n      <label class=\"usa-radio__label\" for=\"question_option_50466\">Strongly Disagree<\/label>\n    <\/div>\n    <div class=\"radio-button usa-radio question-option\"\n      data-id=\"50467\"\n      aria-describedby=\"question-id-45239-help-text\"\n    >\n      <input type=\"radio\" name=\"question_45239_answer_05\" id=\"question_option_50467\" value=\"Disagree\" class=\"usa-radio__input usa-radio__input--tile\" required=\"required\" />\n      <label class=\"usa-radio__label\" for=\"question_option_50467\">Disagree<\/label>\n    <\/div>\n    <div class=\"radio-button usa-radio question-option\"\n      data-id=\"50468\"\n      aria-describedby=\"question-id-45239-help-text\"\n    >\n      <input type=\"radio\" name=\"question_45239_answer_05\" id=\"question_option_50468\" value=\"Neutral\" class=\"usa-radio__input usa-radio__input--tile\" required=\"required\" />\n      <label class=\"usa-radio__label\" for=\"question_option_50468\">Neutral<\/label>\n    <\/div>\n    <div class=\"radio-button usa-radio question-option\"\n      data-id=\"50469\"\n      aria-describedby=\"question-id-45239-help-text\"\n    >\n      <input type=\"radio\" name=\"question_45239_answer_05\" id=\"question_option_50469\" value=\"Agree\" class=\"usa-radio__input usa-radio__input--tile\" required=\"required\" />\n      <label class=\"usa-radio__label\" for=\"question_option_50469\">Agree<\/label>\n    <\/div>\n    <div class=\"radio-button usa-radio question-option\"\n      data-id=\"50470\"\n      aria-describedby=\"question-id-45239-help-text\"\n    >\n      <input type=\"radio\" name=\"question_45239_answer_05\" id=\"question_option_50470\" value=\"Strongly Agree\" class=\"usa-radio__input usa-radio__input--tile\" required=\"required\" />\n      <label class=\"usa-radio__label\" for=\"question_option_50470\">Strongly Agree<\/label>\n    <\/div>\n  <\/div>\n<\/fieldset>\n\n          <\/div>\n\n          <div class=\"question white-bg\"\n            id=\"question_45758\">\n              <div role=\"group\">\n  <label class=\"usa-label\" for=\"question_45758_answer_06\">\n     	 What is your primary reason for visiting this site?\n  <abbr title=\"required\" class=\"usa-hint--required\">*<\/abbr>\n<\/label>\n\n  <div class=\"radio-button\">\n    <select name=\"question_45758_answer_06\" id=\"question_45758_answer_06\" class=\"usa-select\" required=\"required\"><option value=\"\">Select one<\/option><option value=\"General Information\">General Information<\/option>\n<option value=\"NOAA Tools or Services\">NOAA Tools or Services<\/option>\n<option value=\"Scientific Data\">Scientific Data<\/option>\n<option value=\"Research\">Research<\/option>\n<option value=\"Other\">Other<\/option><\/select>\n  <\/div>\n<\/div>\n\n          <\/div>\n\n          <div class=\"question white-bg\"\n            id=\"question_45470\">\n              <div role=\"group\">\n  <label class=\"usa-label\" for=\"question_45470_answer_07\">\n  Which category best describes you? \n  <abbr title=\"required\" class=\"usa-hint--required\">*<\/abbr>\n<\/label>\n\n  <div class=\"radio-button\">\n    <select name=\"question_45470_answer_07\" id=\"question_45470_answer_07\" class=\"usa-select\" required=\"required\"><option value=\"\">Select one<\/option><option value=\"University Faculty/Staff\">University Faculty/Staff<\/option>\n<option value=\"Teacher (K-12)\">Teacher (K-12)<\/option>\n<option value=\"Student (K-12)\">Student (K-12)<\/option>\n<option value=\"Student (University)\">Student (University)<\/option>\n<option value=\"Non-Profit Organization\">Non-Profit Organization<\/option>\n<option value=\"State/Local Government\">State/Local Government<\/option>\n<option value=\"NOAA Employee\">NOAA Employee<\/option>\n<option value=\"Other federal government\">Other federal government<\/option>\n<option value=\"Military\">Military<\/option>\n<option value=\"Policymaker\">Policymaker<\/option>\n<option value=\"Business/Industry\">Business/Industry<\/option>\n<option value=\"News Media\">News Media<\/option>\n<option value=\"General Public\">General Public<\/option>\n<option value=\"OTHER\">Other<\/option><\/select>\n  <\/div>\n<\/div>\n\n          <\/div>\n\n          <div class=\"question white-bg\"\n            id=\"question_45830\">\n              <div role=\"group\">\n  <label class=\"usa-label\" for=\"question_45830_answer_08\">\n  How often do you visit this site?\n  <abbr title=\"required\" class=\"usa-hint--required\">*<\/abbr>\n<\/label>\n\n  <div class=\"radio-button\">\n    <select name=\"question_45830_answer_08\" id=\"question_45830_answer_08\" class=\"usa-select\" required=\"required\"><option value=\"\">Select one<\/option><option value=\"Daily\">Daily<\/option>\n<option value=\"Weekly\">Weekly<\/option>\n<option value=\"Monthly\">Monthly<\/option>\n<option value=\"Occasionally\">Occasionally<\/option>\n<option value=\"Once\">Once<\/option><\/select>\n  <\/div>\n<\/div>\n\n          <\/div>\n\n          <div class=\"question white-bg\"\n            id=\"question_45241\">\n              <fieldset class=\"usa-fieldset margin-top-3\">\n  <legend class=\"usa-legend\" id=\"question-label-45241\">\n  If you were unable to accomplish your task, let us know why. \n  <div\n    id=\"question-id-45241-help-text\"\n    class=\"help-text margin-top-1\"\n  >\n    <small>\n      Select all that apply\n    <\/small>\n  <\/div>\n<\/legend>\n\n  <div class=\"question-options\"\n    id=\"question_45241_answer_09\">\n    <div class=\"usa-checkbox\"\n      data-id=\"50459\"\n      aria-describedby=\"question-id-45241-help-text\"\n    >\n      <input type=\"checkbox\" name=\"question_45241_answer_09\" id=\"question_option_50459\" value=\"The website was not user-friendly or easy to navigate\" class=\"usa-checkbox__input usa-checkbox__input--tile\" />\n      <label for=\"question_option_50459\" class=\"usa-checkbox__label\">The website was not user-friendly or easy to navigate<\/label>\n    <\/div>\n    <div class=\"usa-checkbox\"\n      data-id=\"50460\"\n      aria-describedby=\"question-id-45241-help-text\"\n    >\n      <input type=\"checkbox\" name=\"question_45241_answer_09\" id=\"question_option_50460\" value=\"Technical difficulties\" class=\"usa-checkbox__input usa-checkbox__input--tile\" />\n      <label for=\"question_option_50460\" class=\"usa-checkbox__label\">Technical difficulties<\/label>\n    <\/div>\n    <div class=\"usa-checkbox\"\n      data-id=\"50461\"\n      aria-describedby=\"question-id-45241-help-text\"\n    >\n      <input type=\"checkbox\" name=\"question_45241_answer_09\" id=\"question_option_50461\" value=\"I couldn&#39;t find the information I was looking for\" class=\"usa-checkbox__input usa-checkbox__input--tile\" />\n      <label for=\"question_option_50461\" class=\"usa-checkbox__label\">I couldn&#39;t find the information I was looking for<\/label>\n    <\/div>\n    <div class=\"usa-checkbox\"\n      data-id=\"50462\"\n      aria-describedby=\"question-id-45241-help-text\"\n    >\n      <input type=\"checkbox\" name=\"question_45241_answer_09\" id=\"question_option_50462\" value=\"The site&#39;s design was confusing\" class=\"usa-checkbox__input usa-checkbox__input--tile\" />\n      <label for=\"question_option_50462\" class=\"usa-checkbox__label\">The site&#39;s design was confusing<\/label>\n    <\/div>\n    <div class=\"usa-checkbox\"\n      data-id=\"50463\"\n      aria-describedby=\"question-id-45241-help-text\"\n    >\n      <input type=\"checkbox\" name=\"question_45241_answer_09\" id=\"question_option_50463\" value=\"The site did not support the browser or device I was using\" class=\"usa-checkbox__input usa-checkbox__input--tile\" />\n      <label for=\"question_option_50463\" class=\"usa-checkbox__label\">The site did not support the browser or device I was using<\/label>\n    <\/div>\n    <div class=\"usa-checkbox\"\n      data-id=\"51213\"\n      aria-describedby=\"question-id-45241-help-text\"\n    >\n      <input type=\"checkbox\" name=\"question_45241_answer_09\" id=\"question_option_51213\" value=\"Other\" class=\"usa-checkbox__input usa-checkbox__input--tile\" />\n      <label for=\"question_option_51213\" class=\"usa-checkbox__label\">Other<\/label>\n        <div class=\"margin-top-1\">\n        <label for=\"question_45241_answer_09_other\" class=\"usa-input__label\">Enter other text<\/label>\n        <input type=\"text\"\n          name=\"question_45241_answer_09_other\"\n          id=\"question_45241_answer_09_other\"\n          data-option-id=\"question_option_51213\"\n          placeholder=\"Enter other text\"\n          maxlength=\"10000\"\n          class=\"usa-input other-option\" />\n        <\/div>\n    <\/div>\n  <\/div>\n<\/fieldset>\n\n          <\/div>\n\n          <div class=\"question white-bg\"\n            id=\"question_47553\">\n              \n<div role=\"group\">\n  <label class=\"usa-label\" for=\"question_47553_answer_10\">\n  Do you have suggestions for improving this website?\n<\/label>\n\n  <input type=\"text\" name=\"question_47553_answer_10\" id=\"question_47553_answer_10\" class=\"usa-input\" maxlength=\"1000\" />\n\n  <span class=\"counter-msg usa-hint usa-character-count__message\" aria-live=\"polite\">\n    1000\n    characters allowed\n  <\/span>\n<\/div>\n\n          <\/div>\n        <\/div>\n\n          <button type=\"submit\" class=\"usa-button submit_form_button\">Submit<\/button>\n      <\/div>\n  <\/div>\n<\/form>\n\n  <\/div>\n  \n    <div class=\"touchpoints-form-disclaimer\">\n  <hr class=\"border-0 border-gray-10 border-top\">\n  <div class=\"grid-container\">\n    <div class=\"grid-row\">\n      <div class=\"grid-col-12\">\n        <small class=\"fba-dialog-privacy\">\n          This survey is designed to measure your level of satisfaction with the NCEI website. It consists of nine questions and should take approximately two to five minutes to complete. Please do not use this survey to provide comments on or responses to rules, notices, solicitations or other official agency actions. Any information you provide will be used to for the sole purpose of improving NOAA\'s digital products and services.\n\nIf you wish to provide feedback outside of the scope of this survey, please contact us at <a href=\"mailto: ncei.webmaster@noaa.gov\">ncei.webmaster@noaa.gov<\/a>.\n        <\/small>\n      <\/div>\n    <\/div>\n  <\/div>\n<\/div>\n\n<div class=\"usa-banner\">\n  <footer class=\"usa-banner__header touchpoints-footer-banner\">\n    <div class=\"usa-banner__inner\">\n      <div class=\"grid-col-auto\">\n        <img\n            aria-hidden=\"true\"\n            class=\"usa-banner__header-flag\"\n            src=\"https://touchpoints.app.cloud.gov/img/us_flag_small.png\"\n            alt=\"U.S. flag\"\n          />\n      <\/div>\n      <div class=\"grid-col-fill tablet:grid-col-auto\" aria-hidden=\"true\">\n        <p class=\"usa-banner__header-text\">\n          An official form of the United States government.\n          Provided by\n          <a href=\"https://touchpoints.digital.gov\" target=\"_blank\" rel=\"noopener\" class=\"usa-link--external\">Touchpoints<\/a>\n          <br>\n            OMB Approval #<span class=\"omb-approval-number\">0690-0030<\/span>\n\n            &middot;\n            Expiration Date 07/31/2026\n        <\/p>\n      <\/div>\n    <\/div>\n  <\/footer>\n<\/div>\n\n\n<\/div>\n<\/div>\n";
	},
	'htmlFormBodyNoModal' : function() {
		return null;
	}
}

// Create an instance of a Touchpoints form object
const touchpointForm89426825 = new FBAform(document, window).init(touchpointFormOptions89426825);

// Include USWDS JS if required
/* This file was generated by the gulp task 'bundleWidgetJS'. */

(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

const keymap = require("receptor/keymap");
const selectOrMatches = require("../../uswds-core/src/js/utils/select-or-matches");
const behavior = require("../../uswds-core/src/js/utils/behavior");
const Sanitizer = require("../../uswds-core/src/js/utils/sanitizer");
const {
  prefix: PREFIX
} = require('./../../../../../../uswds/uswds-config.js');
const {
  CLICK
} = require("../../uswds-core/src/js/events");
const COMBO_BOX_CLASS = `${PREFIX}-combo-box`;
const COMBO_BOX_PRISTINE_CLASS = `${COMBO_BOX_CLASS}--pristine`;
const SELECT_CLASS = `${COMBO_BOX_CLASS}__select`;
const INPUT_CLASS = `${COMBO_BOX_CLASS}__input`;
const CLEAR_INPUT_BUTTON_CLASS = `${COMBO_BOX_CLASS}__clear-input`;
const CLEAR_INPUT_BUTTON_WRAPPER_CLASS = `${CLEAR_INPUT_BUTTON_CLASS}__wrapper`;
const INPUT_BUTTON_SEPARATOR_CLASS = `${COMBO_BOX_CLASS}__input-button-separator`;
const TOGGLE_LIST_BUTTON_CLASS = `${COMBO_BOX_CLASS}__toggle-list`;
const TOGGLE_LIST_BUTTON_WRAPPER_CLASS = `${TOGGLE_LIST_BUTTON_CLASS}__wrapper`;
const LIST_CLASS = `${COMBO_BOX_CLASS}__list`;
const LIST_OPTION_CLASS = `${COMBO_BOX_CLASS}__list-option`;
const LIST_OPTION_FOCUSED_CLASS = `${LIST_OPTION_CLASS}--focused`;
const LIST_OPTION_SELECTED_CLASS = `${LIST_OPTION_CLASS}--selected`;
const STATUS_CLASS = `${COMBO_BOX_CLASS}__status`;
const COMBO_BOX = `.${COMBO_BOX_CLASS}`;
const SELECT = `.${SELECT_CLASS}`;
const INPUT = `.${INPUT_CLASS}`;
const CLEAR_INPUT_BUTTON = `.${CLEAR_INPUT_BUTTON_CLASS}`;
const TOGGLE_LIST_BUTTON = `.${TOGGLE_LIST_BUTTON_CLASS}`;
const LIST = `.${LIST_CLASS}`;
const LIST_OPTION = `.${LIST_OPTION_CLASS}`;
const LIST_OPTION_FOCUSED = `.${LIST_OPTION_FOCUSED_CLASS}`;
const LIST_OPTION_SELECTED = `.${LIST_OPTION_SELECTED_CLASS}`;
const STATUS = `.${STATUS_CLASS}`;
const DEFAULT_FILTER = ".*{{query}}.*";
const noop = () => {};

/**
 * set the value of the element and dispatch a change event
 *
 * @param {HTMLInputElement|HTMLSelectElement} el The element to update
 * @param {string} value The new value of the element
 */
const changeElementValue = (el, value = "") => {
  const elementToChange = el;
  elementToChange.value = value;
  const event = new CustomEvent("change", {
    bubbles: true,
    cancelable: true,
    detail: {
      value
    }
  });
  elementToChange.dispatchEvent(event);
};

/**
 * The elements within the combo box.
 * @typedef {Object} ComboBoxContext
 * @property {HTMLElement} comboBoxEl
 * @property {HTMLSelectElement} selectEl
 * @property {HTMLInputElement} inputEl
 * @property {HTMLUListElement} listEl
 * @property {HTMLDivElement} statusEl
 * @property {HTMLLIElement} focusedOptionEl
 * @property {HTMLLIElement} selectedOptionEl
 * @property {HTMLButtonElement} toggleListBtnEl
 * @property {HTMLButtonElement} clearInputBtnEl
 * @property {boolean} isPristine
 * @property {boolean} disableFiltering
 */

/**
 * Get an object of elements belonging directly to the given
 * combo box component.
 *
 * @param {HTMLElement} el the element within the combo box
 * @returns {ComboBoxContext} elements
 */
const getComboBoxContext = el => {
  const comboBoxEl = el.closest(COMBO_BOX);
  if (!comboBoxEl) {
    throw new Error(`Element is missing outer ${COMBO_BOX}`);
  }
  const selectEl = comboBoxEl.querySelector(SELECT);
  const inputEl = comboBoxEl.querySelector(INPUT);
  const listEl = comboBoxEl.querySelector(LIST);
  const statusEl = comboBoxEl.querySelector(STATUS);
  const focusedOptionEl = comboBoxEl.querySelector(LIST_OPTION_FOCUSED);
  const selectedOptionEl = comboBoxEl.querySelector(LIST_OPTION_SELECTED);
  const toggleListBtnEl = comboBoxEl.querySelector(TOGGLE_LIST_BUTTON);
  const clearInputBtnEl = comboBoxEl.querySelector(CLEAR_INPUT_BUTTON);
  const isPristine = comboBoxEl.classList.contains(COMBO_BOX_PRISTINE_CLASS);
  const disableFiltering = comboBoxEl.dataset.disableFiltering === "true";
  return {
    comboBoxEl,
    selectEl,
    inputEl,
    listEl,
    statusEl,
    focusedOptionEl,
    selectedOptionEl,
    toggleListBtnEl,
    clearInputBtnEl,
    isPristine,
    disableFiltering
  };
};

/**
 * Disable the combo-box component
 *
 * @param {HTMLInputElement} el An element within the combo box component
 */
const disable = el => {
  const {
    inputEl,
    toggleListBtnEl,
    clearInputBtnEl
  } = getComboBoxContext(el);
  clearInputBtnEl.hidden = true;
  clearInputBtnEl.disabled = true;
  toggleListBtnEl.disabled = true;
  inputEl.disabled = true;
};

/**
 * Check for aria-disabled on initialization
 *
 * @param {HTMLInputElement} el An element within the combo box component
 */
const ariaDisable = el => {
  const {
    inputEl,
    toggleListBtnEl,
    clearInputBtnEl
  } = getComboBoxContext(el);
  clearInputBtnEl.hidden = true;
  clearInputBtnEl.setAttribute("aria-disabled", true);
  toggleListBtnEl.setAttribute("aria-disabled", true);
  inputEl.setAttribute("aria-disabled", true);
};

/**
 * Enable the combo-box component
 *
 * @param {HTMLInputElement} el An element within the combo box component
 */
const enable = el => {
  const {
    inputEl,
    toggleListBtnEl,
    clearInputBtnEl
  } = getComboBoxContext(el);
  clearInputBtnEl.hidden = false;
  clearInputBtnEl.disabled = false;
  toggleListBtnEl.disabled = false;
  inputEl.disabled = false;
};

/**
 * Enhance a select element into a combo box component.
 *
 * @param {HTMLElement} _comboBoxEl The initial element of the combo box component
 */
const enhanceComboBox = _comboBoxEl => {
  const comboBoxEl = _comboBoxEl.closest(COMBO_BOX);
  if (comboBoxEl.dataset.enhanced) return;
  const selectEl = comboBoxEl.querySelector("select");
  if (!selectEl) {
    throw new Error(`${COMBO_BOX} is missing inner select`);
  }
  const selectId = selectEl.id;
  const selectLabel = document.querySelector(`label[for="${selectId}"]`);
  const listId = `${selectId}--list`;
  const listIdLabel = `${selectId}-label`;
  const assistiveHintID = `${selectId}--assistiveHint`;
  const additionalAttributes = [];
  const {
    defaultValue
  } = comboBoxEl.dataset;
  const {
    placeholder
  } = comboBoxEl.dataset;
  let selectedOption;
  if (placeholder) {
    additionalAttributes.push({
      placeholder
    });
  }
  if (defaultValue) {
    for (let i = 0, len = selectEl.options.length; i < len; i += 1) {
      const optionEl = selectEl.options[i];
      if (optionEl.value === defaultValue) {
        selectedOption = optionEl;
        break;
      }
    }
  }

  /**
   * Throw error if combobox is missing a label or label is missing
   * `for` attribute. Otherwise, set the ID to match the <ul> aria-labelledby
   */
  if (!selectLabel || !selectLabel.matches(`label[for="${selectId}"]`)) {
    throw new Error(`${COMBO_BOX} for ${selectId} is either missing a label or a "for" attribute`);
  } else {
    selectLabel.setAttribute("id", listIdLabel);
  }
  selectLabel.setAttribute("id", listIdLabel);
  selectEl.setAttribute("aria-hidden", "true");
  selectEl.setAttribute("tabindex", "-1");
  selectEl.classList.add("usa-sr-only", SELECT_CLASS);
  selectEl.id = "";
  selectEl.value = "";
  ["required", "aria-label", "aria-labelledby"].forEach(name => {
    if (selectEl.hasAttribute(name)) {
      const value = selectEl.getAttribute(name);
      additionalAttributes.push({
        [name]: value
      });
      selectEl.removeAttribute(name);
    }
  });

  // sanitize doesn't like functions in template literals
  const input = document.createElement("input");
  input.setAttribute("id", selectId);
  input.setAttribute("aria-owns", listId);
  input.setAttribute("aria-controls", listId);
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-describedby", assistiveHintID);
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("autocapitalize", "off");
  input.setAttribute("autocomplete", "off");
  input.setAttribute("class", INPUT_CLASS);
  input.setAttribute("type", "text");
  input.setAttribute("role", "combobox");
  additionalAttributes.forEach(attr => Object.keys(attr).forEach(key => {
    const value = Sanitizer.escapeHTML`${attr[key]}`;
    input.setAttribute(key, value);
  }));
  comboBoxEl.insertAdjacentElement("beforeend", input);
  comboBoxEl.insertAdjacentHTML("beforeend", Sanitizer.escapeHTML`
    <span class="${CLEAR_INPUT_BUTTON_WRAPPER_CLASS}" tabindex="-1">
        <button type="button" class="${CLEAR_INPUT_BUTTON_CLASS}" aria-label="Clear the select contents">&nbsp;</button>
      </span>
      <span class="${INPUT_BUTTON_SEPARATOR_CLASS}">&nbsp;</span>
      <span class="${TOGGLE_LIST_BUTTON_WRAPPER_CLASS}" tabindex="-1">
        <button type="button" tabindex="-1" class="${TOGGLE_LIST_BUTTON_CLASS}" aria-label="Toggle the dropdown list">&nbsp;</button>
      </span>
      <ul
        tabindex="-1"
        id="${listId}"
        class="${LIST_CLASS}"
        role="listbox"
        aria-labelledby="${listIdLabel}"
        hidden>
      </ul>
      <div class="${STATUS_CLASS} usa-sr-only" role="status"></div>
      <span id="${assistiveHintID}" class="usa-sr-only">
        When autocomplete results are available use up and down arrows to review and enter to select.
        Touch device users, explore by touch or with swipe gestures.
      </span>`);
  if (selectedOption) {
    const {
      inputEl
    } = getComboBoxContext(comboBoxEl);
    changeElementValue(selectEl, selectedOption.value);
    changeElementValue(inputEl, selectedOption.text);
    comboBoxEl.classList.add(COMBO_BOX_PRISTINE_CLASS);
  }
  if (selectEl.disabled) {
    disable(comboBoxEl);
    selectEl.disabled = false;
  }
  if (selectEl.hasAttribute("aria-disabled")) {
    ariaDisable(comboBoxEl);
    selectEl.removeAttribute("aria-disabled");
  }
  comboBoxEl.dataset.enhanced = "true";
};

/**
 * Manage the focused element within the list options when
 * navigating via keyboard.
 *
 * @param {HTMLElement} el An anchor element within the combo box component
 * @param {HTMLElement} nextEl An element within the combo box component
 * @param {Object} options options
 * @param {boolean} options.skipFocus skip focus of highlighted item
 * @param {boolean} options.preventScroll should skip procedure to scroll to element
 */
const highlightOption = (el, nextEl, {
  skipFocus,
  preventScroll
} = {}) => {
  const {
    inputEl,
    listEl,
    focusedOptionEl
  } = getComboBoxContext(el);
  if (focusedOptionEl) {
    focusedOptionEl.classList.remove(LIST_OPTION_FOCUSED_CLASS);
    focusedOptionEl.setAttribute("tabIndex", "-1");
  }
  if (nextEl) {
    inputEl.setAttribute("aria-activedescendant", nextEl.id);
    nextEl.setAttribute("tabIndex", "0");
    nextEl.classList.add(LIST_OPTION_FOCUSED_CLASS);
    if (!preventScroll) {
      const optionBottom = nextEl.offsetTop + nextEl.offsetHeight;
      const currentBottom = listEl.scrollTop + listEl.offsetHeight;
      if (optionBottom > currentBottom) {
        listEl.scrollTop = optionBottom - listEl.offsetHeight;
      }
      if (nextEl.offsetTop < listEl.scrollTop) {
        listEl.scrollTop = nextEl.offsetTop;
      }
    }
    if (!skipFocus) {
      nextEl.focus({
        preventScroll
      });
    }
  } else {
    inputEl.setAttribute("aria-activedescendant", "");
    inputEl.focus();
  }
};

/**
 * Generate a dynamic regular expression based off of a replaceable and possibly filtered value.
 *
 * @param {string} el An element within the combo box component
 * @param {string} query The value to use in the regular expression
 * @param {object} extras An object of regular expressions to replace and filter the query
 */
const generateDynamicRegExp = (filter, query = "", extras = {}) => {
  const escapeRegExp = text => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  let find = filter.replace(/{{(.*?)}}/g, (m, $1) => {
    const key = $1.trim();
    const queryFilter = extras[key];
    if (key !== "query" && queryFilter) {
      const matcher = new RegExp(queryFilter, "i");
      const matches = query.match(matcher);
      if (matches) {
        return escapeRegExp(matches[1]);
      }
      return "";
    }
    return escapeRegExp(query);
  });
  find = `^(?:${find})$`;
  return new RegExp(find, "i");
};

/**
 * Display the option list of a combo box component.
 *
 * @param {HTMLElement} el An element within the combo box component
 */
const displayList = el => {
  const {
    comboBoxEl,
    selectEl,
    inputEl,
    listEl,
    statusEl,
    isPristine,
    disableFiltering
  } = getComboBoxContext(el);
  let selectedItemId;
  let firstFoundId;
  const listOptionBaseId = `${listEl.id}--option-`;
  const inputValue = (inputEl.value || "").toLowerCase();
  const filter = comboBoxEl.dataset.filter || DEFAULT_FILTER;
  const regex = generateDynamicRegExp(filter, inputValue, comboBoxEl.dataset);
  const options = [];
  for (let i = 0, len = selectEl.options.length; i < len; i += 1) {
    const optionEl = selectEl.options[i];
    const optionId = `${listOptionBaseId}${options.length}`;
    if (optionEl.value && (disableFiltering || isPristine || !inputValue || regex.test(optionEl.text))) {
      if (selectEl.value && optionEl.value === selectEl.value) {
        selectedItemId = optionId;
      }
      if (disableFiltering && !firstFoundId && regex.test(optionEl.text)) {
        firstFoundId = optionId;
      }
      options.push(optionEl);
    }
  }
  const numOptions = options.length;
  const optionHtml = options.map((option, index) => {
    const optionId = `${listOptionBaseId}${index}`;
    const classes = [LIST_OPTION_CLASS];
    let tabindex = "-1";
    let ariaSelected = "false";
    if (optionId === selectedItemId) {
      classes.push(LIST_OPTION_SELECTED_CLASS, LIST_OPTION_FOCUSED_CLASS);
      tabindex = "0";
      ariaSelected = "true";
    }
    if (!selectedItemId && index === 0) {
      classes.push(LIST_OPTION_FOCUSED_CLASS);
      tabindex = "0";
    }
    const li = document.createElement("li");
    li.setAttribute("aria-setsize", options.length);
    li.setAttribute("aria-posinset", index + 1);
    li.setAttribute("aria-selected", ariaSelected);
    li.setAttribute("id", optionId);
    li.setAttribute("class", classes.join(" "));
    li.setAttribute("tabindex", tabindex);
    li.setAttribute("role", "option");
    li.setAttribute("data-value", option.value);
    li.textContent = option.text;
    return li;
  });
  const noResults = document.createElement("li");
  noResults.setAttribute("class", `${LIST_OPTION_CLASS}--no-results`);
  noResults.textContent = "No results found";
  listEl.hidden = false;
  if (numOptions) {
    listEl.innerHTML = "";
    optionHtml.forEach(item => listEl.insertAdjacentElement("beforeend", item));
  } else {
    listEl.innerHTML = "";
    listEl.insertAdjacentElement("beforeend", noResults);
  }
  inputEl.setAttribute("aria-expanded", "true");
  statusEl.textContent = numOptions ? `${numOptions} result${numOptions > 1 ? "s" : ""} available.` : "No results.";
  let itemToFocus;
  if (isPristine && selectedItemId) {
    itemToFocus = listEl.querySelector(`#${selectedItemId}`);
  } else if (disableFiltering && firstFoundId) {
    itemToFocus = listEl.querySelector(`#${firstFoundId}`);
  }
  if (itemToFocus) {
    highlightOption(listEl, itemToFocus, {
      skipFocus: true
    });
  }
};

/**
 * Hide the option list of a combo box component.
 *
 * @param {HTMLElement} el An element within the combo box component
 */
const hideList = el => {
  const {
    inputEl,
    listEl,
    statusEl,
    focusedOptionEl
  } = getComboBoxContext(el);
  statusEl.innerHTML = "";
  inputEl.setAttribute("aria-expanded", "false");
  inputEl.setAttribute("aria-activedescendant", "");
  if (focusedOptionEl) {
    focusedOptionEl.classList.remove(LIST_OPTION_FOCUSED_CLASS);
  }
  listEl.scrollTop = 0;
  listEl.hidden = true;
};

/**
 * Select an option list of the combo box component.
 *
 * @param {HTMLElement} listOptionEl The list option being selected
 */
const selectItem = listOptionEl => {
  const {
    comboBoxEl,
    selectEl,
    inputEl
  } = getComboBoxContext(listOptionEl);
  changeElementValue(selectEl, listOptionEl.dataset.value);
  changeElementValue(inputEl, listOptionEl.textContent);
  comboBoxEl.classList.add(COMBO_BOX_PRISTINE_CLASS);
  hideList(comboBoxEl);
  inputEl.focus();
};

/**
 * Clear the input of the combo box
 *
 * @param {HTMLButtonElement} clearButtonEl The clear input button
 */
const clearInput = clearButtonEl => {
  const {
    comboBoxEl,
    listEl,
    selectEl,
    inputEl
  } = getComboBoxContext(clearButtonEl);
  const listShown = !listEl.hidden;
  if (selectEl.value) changeElementValue(selectEl);
  if (inputEl.value) changeElementValue(inputEl);
  comboBoxEl.classList.remove(COMBO_BOX_PRISTINE_CLASS);
  if (listShown) displayList(comboBoxEl);
  inputEl.focus();
};

/**
 * Reset the select based off of currently set select value
 *
 * @param {HTMLElement} el An element within the combo box component
 */
const resetSelection = el => {
  const {
    comboBoxEl,
    selectEl,
    inputEl
  } = getComboBoxContext(el);
  const selectValue = selectEl.value;
  const inputValue = (inputEl.value || "").toLowerCase();
  if (selectValue) {
    for (let i = 0, len = selectEl.options.length; i < len; i += 1) {
      const optionEl = selectEl.options[i];
      if (optionEl.value === selectValue) {
        if (inputValue !== optionEl.text) {
          changeElementValue(inputEl, optionEl.text);
        }
        comboBoxEl.classList.add(COMBO_BOX_PRISTINE_CLASS);
        return;
      }
    }
  }
  if (inputValue) {
    changeElementValue(inputEl);
  }
};

/**
 * Select an option list of the combo box component based off of
 * having a current focused list option or
 * having test that completely matches a list option.
 * Otherwise it clears the input and select.
 *
 * @param {HTMLElement} el An element within the combo box component
 */
const completeSelection = el => {
  const {
    comboBoxEl,
    selectEl,
    inputEl,
    statusEl
  } = getComboBoxContext(el);
  statusEl.textContent = "";
  const inputValue = (inputEl.value || "").toLowerCase();
  if (inputValue) {
    for (let i = 0, len = selectEl.options.length; i < len; i += 1) {
      const optionEl = selectEl.options[i];
      if (optionEl.text.toLowerCase() === inputValue) {
        changeElementValue(selectEl, optionEl.value);
        changeElementValue(inputEl, optionEl.text);
        comboBoxEl.classList.add(COMBO_BOX_PRISTINE_CLASS);
        return;
      }
    }
  }
  resetSelection(comboBoxEl);
};

/**
 * Handle the escape event within the combo box component.
 *
 * @param {KeyboardEvent} event An event within the combo box component
 */
const handleEscape = event => {
  const {
    comboBoxEl,
    inputEl
  } = getComboBoxContext(event.target);
  hideList(comboBoxEl);
  resetSelection(comboBoxEl);
  inputEl.focus();
};

/**
 * Handle the down event within the combo box component.
 *
 * @param {KeyboardEvent} event An event within the combo box component
 */
const handleDownFromInput = event => {
  const {
    comboBoxEl,
    listEl
  } = getComboBoxContext(event.target);
  if (listEl.hidden) {
    displayList(comboBoxEl);
  }
  const nextOptionEl = listEl.querySelector(LIST_OPTION_FOCUSED) || listEl.querySelector(LIST_OPTION);
  if (nextOptionEl) {
    highlightOption(comboBoxEl, nextOptionEl);
  }
  event.preventDefault();
};

/**
 * Handle the enter event from an input element within the combo box component.
 *
 * @param {KeyboardEvent} event An event within the combo box component
 */
const handleEnterFromInput = event => {
  const {
    comboBoxEl,
    listEl
  } = getComboBoxContext(event.target);
  const listShown = !listEl.hidden;
  completeSelection(comboBoxEl);
  if (listShown) {
    hideList(comboBoxEl);
  }
  event.preventDefault();
};

/**
 * Handle the down event within the combo box component.
 *
 * @param {KeyboardEvent} event An event within the combo box component
 */
const handleDownFromListOption = event => {
  const focusedOptionEl = event.target;
  const nextOptionEl = focusedOptionEl.nextSibling;
  if (nextOptionEl) {
    highlightOption(focusedOptionEl, nextOptionEl);
  }
  event.preventDefault();
};

/**
 * Handle the space event from an list option element within the combo box component.
 *
 * @param {KeyboardEvent} event An event within the combo box component
 */
const handleSpaceFromListOption = event => {
  selectItem(event.target);
  event.preventDefault();
};

/**
 * Handle the enter event from list option within the combo box component.
 *
 * @param {KeyboardEvent} event An event within the combo box component
 */
const handleEnterFromListOption = event => {
  selectItem(event.target);
  event.preventDefault();
};

/**
 * Handle the up event from list option within the combo box component.
 *
 * @param {KeyboardEvent} event An event within the combo box component
 */
const handleUpFromListOption = event => {
  const {
    comboBoxEl,
    listEl,
    focusedOptionEl
  } = getComboBoxContext(event.target);
  const nextOptionEl = focusedOptionEl && focusedOptionEl.previousSibling;
  const listShown = !listEl.hidden;
  highlightOption(comboBoxEl, nextOptionEl);
  if (listShown) {
    event.preventDefault();
  }
  if (!nextOptionEl) {
    hideList(comboBoxEl);
  }
};

/**
 * Select list option on the mouseover event.
 *
 * @param {MouseEvent} event The mouseover event
 * @param {HTMLLIElement} listOptionEl An element within the combo box component
 */
const handleMouseover = listOptionEl => {
  const isCurrentlyFocused = listOptionEl.classList.contains(LIST_OPTION_FOCUSED_CLASS);
  if (isCurrentlyFocused) return;
  highlightOption(listOptionEl, listOptionEl, {
    preventScroll: true
  });
};

/**
 * Toggle the list when the button is clicked
 *
 * @param {HTMLElement} el An element within the combo box component
 */
const toggleList = el => {
  const {
    comboBoxEl,
    listEl,
    inputEl
  } = getComboBoxContext(el);
  if (listEl.hidden) {
    displayList(comboBoxEl);
  } else {
    hideList(comboBoxEl);
  }
  inputEl.focus();
};

/**
 * Handle click from input
 *
 * @param {HTMLInputElement} el An element within the combo box component
 */
const handleClickFromInput = el => {
  const {
    comboBoxEl,
    listEl
  } = getComboBoxContext(el);
  if (listEl.hidden) {
    displayList(comboBoxEl);
  }
};
const comboBox = behavior({
  [CLICK]: {
    [INPUT]() {
      if (this.disabled) return;
      handleClickFromInput(this);
    },
    [TOGGLE_LIST_BUTTON]() {
      if (this.disabled) return;
      toggleList(this);
    },
    [LIST_OPTION]() {
      if (this.disabled) return;
      selectItem(this);
    },
    [CLEAR_INPUT_BUTTON]() {
      if (this.disabled) return;
      clearInput(this);
    }
  },
  focusout: {
    [COMBO_BOX](event) {
      if (!this.contains(event.relatedTarget)) {
        resetSelection(this);
        hideList(this);
      }
    }
  },
  keydown: {
    [COMBO_BOX]: keymap({
      Escape: handleEscape
    }),
    [INPUT]: keymap({
      Enter: handleEnterFromInput,
      ArrowDown: handleDownFromInput,
      Down: handleDownFromInput
    }),
    [LIST_OPTION]: keymap({
      ArrowUp: handleUpFromListOption,
      Up: handleUpFromListOption,
      ArrowDown: handleDownFromListOption,
      Down: handleDownFromListOption,
      Enter: handleEnterFromListOption,
      " ": handleSpaceFromListOption,
      "Shift+Tab": noop
    })
  },
  input: {
    [INPUT]() {
      const comboBoxEl = this.closest(COMBO_BOX);
      comboBoxEl.classList.remove(COMBO_BOX_PRISTINE_CLASS);
      displayList(this);
    }
  },
  mouseover: {
    [LIST_OPTION]() {
      handleMouseover(this);
    }
  }
}, {
  init(root) {
    selectOrMatches(COMBO_BOX, root).forEach(comboBoxEl => {
      enhanceComboBox(comboBoxEl);
    });
  },
  getComboBoxContext,
  enhanceComboBox,
  generateDynamicRegExp,
  disable,
  enable,
  displayList,
  hideList,
  COMBO_BOX_CLASS
});
module.exports = comboBox;

},{"../../uswds-core/src/js/events":4,"../../uswds-core/src/js/utils/behavior":6,"../../uswds-core/src/js/utils/sanitizer":9,"../../uswds-core/src/js/utils/select-or-matches":11,"./../../../../../../uswds/uswds-config.js":23,"receptor/keymap":22}],2:[function(require,module,exports){
"use strict";

const keymap = require("receptor/keymap");
const behavior = require("../../uswds-core/src/js/utils/behavior");
const select = require("../../uswds-core/src/js/utils/select");
const selectOrMatches = require("../../uswds-core/src/js/utils/select-or-matches");
const {
  prefix: PREFIX
} = require('./../../../../../../uswds/uswds-config.js');
const {
  CLICK
} = require("../../uswds-core/src/js/events");
const activeElement = require("../../uswds-core/src/js/utils/active-element");
const isIosDevice = require("../../uswds-core/src/js/utils/is-ios-device");
const Sanitizer = require("../../uswds-core/src/js/utils/sanitizer");
const DATE_PICKER_CLASS = `${PREFIX}-date-picker`;
const DATE_PICKER_WRAPPER_CLASS = `${DATE_PICKER_CLASS}__wrapper`;
const DATE_PICKER_INITIALIZED_CLASS = `${DATE_PICKER_CLASS}--initialized`;
const DATE_PICKER_ACTIVE_CLASS = `${DATE_PICKER_CLASS}--active`;
const DATE_PICKER_INTERNAL_INPUT_CLASS = `${DATE_PICKER_CLASS}__internal-input`;
const DATE_PICKER_EXTERNAL_INPUT_CLASS = `${DATE_PICKER_CLASS}__external-input`;
const DATE_PICKER_BUTTON_CLASS = `${DATE_PICKER_CLASS}__button`;
const DATE_PICKER_CALENDAR_CLASS = `${DATE_PICKER_CLASS}__calendar`;
const DATE_PICKER_STATUS_CLASS = `${DATE_PICKER_CLASS}__status`;
const CALENDAR_DATE_CLASS = `${DATE_PICKER_CALENDAR_CLASS}__date`;
const CALENDAR_DATE_FOCUSED_CLASS = `${CALENDAR_DATE_CLASS}--focused`;
const CALENDAR_DATE_SELECTED_CLASS = `${CALENDAR_DATE_CLASS}--selected`;
const CALENDAR_DATE_PREVIOUS_MONTH_CLASS = `${CALENDAR_DATE_CLASS}--previous-month`;
const CALENDAR_DATE_CURRENT_MONTH_CLASS = `${CALENDAR_DATE_CLASS}--current-month`;
const CALENDAR_DATE_NEXT_MONTH_CLASS = `${CALENDAR_DATE_CLASS}--next-month`;
const CALENDAR_DATE_RANGE_DATE_CLASS = `${CALENDAR_DATE_CLASS}--range-date`;
const CALENDAR_DATE_TODAY_CLASS = `${CALENDAR_DATE_CLASS}--today`;
const CALENDAR_DATE_RANGE_DATE_START_CLASS = `${CALENDAR_DATE_CLASS}--range-date-start`;
const CALENDAR_DATE_RANGE_DATE_END_CLASS = `${CALENDAR_DATE_CLASS}--range-date-end`;
const CALENDAR_DATE_WITHIN_RANGE_CLASS = `${CALENDAR_DATE_CLASS}--within-range`;
const CALENDAR_PREVIOUS_YEAR_CLASS = `${DATE_PICKER_CALENDAR_CLASS}__previous-year`;
const CALENDAR_PREVIOUS_MONTH_CLASS = `${DATE_PICKER_CALENDAR_CLASS}__previous-month`;
const CALENDAR_NEXT_YEAR_CLASS = `${DATE_PICKER_CALENDAR_CLASS}__next-year`;
const CALENDAR_NEXT_MONTH_CLASS = `${DATE_PICKER_CALENDAR_CLASS}__next-month`;
const CALENDAR_MONTH_SELECTION_CLASS = `${DATE_PICKER_CALENDAR_CLASS}__month-selection`;
const CALENDAR_YEAR_SELECTION_CLASS = `${DATE_PICKER_CALENDAR_CLASS}__year-selection`;
const CALENDAR_MONTH_CLASS = `${DATE_PICKER_CALENDAR_CLASS}__month`;
const CALENDAR_MONTH_FOCUSED_CLASS = `${CALENDAR_MONTH_CLASS}--focused`;
const CALENDAR_MONTH_SELECTED_CLASS = `${CALENDAR_MONTH_CLASS}--selected`;
const CALENDAR_YEAR_CLASS = `${DATE_PICKER_CALENDAR_CLASS}__year`;
const CALENDAR_YEAR_FOCUSED_CLASS = `${CALENDAR_YEAR_CLASS}--focused`;
const CALENDAR_YEAR_SELECTED_CLASS = `${CALENDAR_YEAR_CLASS}--selected`;
const CALENDAR_PREVIOUS_YEAR_CHUNK_CLASS = `${DATE_PICKER_CALENDAR_CLASS}__previous-year-chunk`;
const CALENDAR_NEXT_YEAR_CHUNK_CLASS = `${DATE_PICKER_CALENDAR_CLASS}__next-year-chunk`;
const CALENDAR_DATE_PICKER_CLASS = `${DATE_PICKER_CALENDAR_CLASS}__date-picker`;
const CALENDAR_MONTH_PICKER_CLASS = `${DATE_PICKER_CALENDAR_CLASS}__month-picker`;
const CALENDAR_YEAR_PICKER_CLASS = `${DATE_PICKER_CALENDAR_CLASS}__year-picker`;
const CALENDAR_TABLE_CLASS = `${DATE_PICKER_CALENDAR_CLASS}__table`;
const CALENDAR_ROW_CLASS = `${DATE_PICKER_CALENDAR_CLASS}__row`;
const CALENDAR_CELL_CLASS = `${DATE_PICKER_CALENDAR_CLASS}__cell`;
const CALENDAR_CELL_CENTER_ITEMS_CLASS = `${CALENDAR_CELL_CLASS}--center-items`;
const CALENDAR_MONTH_LABEL_CLASS = `${DATE_PICKER_CALENDAR_CLASS}__month-label`;
const CALENDAR_DAY_OF_WEEK_CLASS = `${DATE_PICKER_CALENDAR_CLASS}__day-of-week`;
const DATE_PICKER = `.${DATE_PICKER_CLASS}`;
const DATE_PICKER_BUTTON = `.${DATE_PICKER_BUTTON_CLASS}`;
const DATE_PICKER_INTERNAL_INPUT = `.${DATE_PICKER_INTERNAL_INPUT_CLASS}`;
const DATE_PICKER_EXTERNAL_INPUT = `.${DATE_PICKER_EXTERNAL_INPUT_CLASS}`;
const DATE_PICKER_CALENDAR = `.${DATE_PICKER_CALENDAR_CLASS}`;
const DATE_PICKER_STATUS = `.${DATE_PICKER_STATUS_CLASS}`;
const CALENDAR_DATE = `.${CALENDAR_DATE_CLASS}`;
const CALENDAR_DATE_FOCUSED = `.${CALENDAR_DATE_FOCUSED_CLASS}`;
const CALENDAR_DATE_CURRENT_MONTH = `.${CALENDAR_DATE_CURRENT_MONTH_CLASS}`;
const CALENDAR_PREVIOUS_YEAR = `.${CALENDAR_PREVIOUS_YEAR_CLASS}`;
const CALENDAR_PREVIOUS_MONTH = `.${CALENDAR_PREVIOUS_MONTH_CLASS}`;
const CALENDAR_NEXT_YEAR = `.${CALENDAR_NEXT_YEAR_CLASS}`;
const CALENDAR_NEXT_MONTH = `.${CALENDAR_NEXT_MONTH_CLASS}`;
const CALENDAR_YEAR_SELECTION = `.${CALENDAR_YEAR_SELECTION_CLASS}`;
const CALENDAR_MONTH_SELECTION = `.${CALENDAR_MONTH_SELECTION_CLASS}`;
const CALENDAR_MONTH = `.${CALENDAR_MONTH_CLASS}`;
const CALENDAR_YEAR = `.${CALENDAR_YEAR_CLASS}`;
const CALENDAR_PREVIOUS_YEAR_CHUNK = `.${CALENDAR_PREVIOUS_YEAR_CHUNK_CLASS}`;
const CALENDAR_NEXT_YEAR_CHUNK = `.${CALENDAR_NEXT_YEAR_CHUNK_CLASS}`;
const CALENDAR_DATE_PICKER = `.${CALENDAR_DATE_PICKER_CLASS}`;
const CALENDAR_MONTH_PICKER = `.${CALENDAR_MONTH_PICKER_CLASS}`;
const CALENDAR_YEAR_PICKER = `.${CALENDAR_YEAR_PICKER_CLASS}`;
const CALENDAR_MONTH_FOCUSED = `.${CALENDAR_MONTH_FOCUSED_CLASS}`;
const CALENDAR_YEAR_FOCUSED = `.${CALENDAR_YEAR_FOCUSED_CLASS}`;
const VALIDATION_MESSAGE = "Please enter a valid date";
const MONTH_LABELS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_OF_WEEK_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ENTER_KEYCODE = 13;
const YEAR_CHUNK = 12;
const DEFAULT_MIN_DATE = "0000-01-01";
const DEFAULT_EXTERNAL_DATE_FORMAT = "MM/DD/YYYY";
const INTERNAL_DATE_FORMAT = "YYYY-MM-DD";
const NOT_DISABLED_SELECTOR = ":not([disabled])";
const processFocusableSelectors = (...selectors) => selectors.map(query => query + NOT_DISABLED_SELECTOR).join(", ");
const DATE_PICKER_FOCUSABLE = processFocusableSelectors(CALENDAR_PREVIOUS_YEAR, CALENDAR_PREVIOUS_MONTH, CALENDAR_YEAR_SELECTION, CALENDAR_MONTH_SELECTION, CALENDAR_NEXT_YEAR, CALENDAR_NEXT_MONTH, CALENDAR_DATE_FOCUSED);
const MONTH_PICKER_FOCUSABLE = processFocusableSelectors(CALENDAR_MONTH_FOCUSED);
const YEAR_PICKER_FOCUSABLE = processFocusableSelectors(CALENDAR_PREVIOUS_YEAR_CHUNK, CALENDAR_NEXT_YEAR_CHUNK, CALENDAR_YEAR_FOCUSED);

// #region Date Manipulation Functions

/**
 * Keep date within month. Month would only be over by 1 to 3 days
 *
 * @param {Date} dateToCheck the date object to check
 * @param {number} month the correct month
 * @returns {Date} the date, corrected if needed
 */
const keepDateWithinMonth = (dateToCheck, month) => {
  if (month !== dateToCheck.getMonth()) {
    dateToCheck.setDate(0);
  }
  return dateToCheck;
};

/**
 * Set date from month day year
 *
 * @param {number} year the year to set
 * @param {number} month the month to set (zero-indexed)
 * @param {number} date the date to set
 * @returns {Date} the set date
 */
const setDate = (year, month, date) => {
  const newDate = new Date(0);
  newDate.setFullYear(year, month, date);
  return newDate;
};

/**
 * todays date
 *
 * @returns {Date} todays date
 */
const today = () => {
  const newDate = new Date();
  const day = newDate.getDate();
  const month = newDate.getMonth();
  const year = newDate.getFullYear();
  return setDate(year, month, day);
};

/**
 * Set date to first day of the month
 *
 * @param {number} date the date to adjust
 * @returns {Date} the adjusted date
 */
const startOfMonth = date => {
  const newDate = new Date(0);
  newDate.setFullYear(date.getFullYear(), date.getMonth(), 1);
  return newDate;
};

/**
 * Set date to last day of the month
 *
 * @param {number} date the date to adjust
 * @returns {Date} the adjusted date
 */
const lastDayOfMonth = date => {
  const newDate = new Date(0);
  newDate.setFullYear(date.getFullYear(), date.getMonth() + 1, 0);
  return newDate;
};

/**
 * Add days to date
 *
 * @param {Date} _date the date to adjust
 * @param {number} numDays the difference in days
 * @returns {Date} the adjusted date
 */
const addDays = (_date, numDays) => {
  const newDate = new Date(_date.getTime());
  newDate.setDate(newDate.getDate() + numDays);
  return newDate;
};

/**
 * Subtract days from date
 *
 * @param {Date} _date the date to adjust
 * @param {number} numDays the difference in days
 * @returns {Date} the adjusted date
 */
const subDays = (_date, numDays) => addDays(_date, -numDays);

/**
 * Add weeks to date
 *
 * @param {Date} _date the date to adjust
 * @param {number} numWeeks the difference in weeks
 * @returns {Date} the adjusted date
 */
const addWeeks = (_date, numWeeks) => addDays(_date, numWeeks * 7);

/**
 * Subtract weeks from date
 *
 * @param {Date} _date the date to adjust
 * @param {number} numWeeks the difference in weeks
 * @returns {Date} the adjusted date
 */
const subWeeks = (_date, numWeeks) => addWeeks(_date, -numWeeks);

/**
 * Set date to the start of the week (Sunday)
 *
 * @param {Date} _date the date to adjust
 * @returns {Date} the adjusted date
 */
const startOfWeek = _date => {
  const dayOfWeek = _date.getDay();
  return subDays(_date, dayOfWeek);
};

/**
 * Set date to the end of the week (Saturday)
 *
 * @param {Date} _date the date to adjust
 * @param {number} numWeeks the difference in weeks
 * @returns {Date} the adjusted date
 */
const endOfWeek = _date => {
  const dayOfWeek = _date.getDay();
  return addDays(_date, 6 - dayOfWeek);
};

/**
 * Add months to date and keep date within month
 *
 * @param {Date} _date the date to adjust
 * @param {number} numMonths the difference in months
 * @returns {Date} the adjusted date
 */
const addMonths = (_date, numMonths) => {
  const newDate = new Date(_date.getTime());
  const dateMonth = (newDate.getMonth() + 12 + numMonths) % 12;
  newDate.setMonth(newDate.getMonth() + numMonths);
  keepDateWithinMonth(newDate, dateMonth);
  return newDate;
};

/**
 * Subtract months from date
 *
 * @param {Date} _date the date to adjust
 * @param {number} numMonths the difference in months
 * @returns {Date} the adjusted date
 */
const subMonths = (_date, numMonths) => addMonths(_date, -numMonths);

/**
 * Add years to date and keep date within month
 *
 * @param {Date} _date the date to adjust
 * @param {number} numYears the difference in years
 * @returns {Date} the adjusted date
 */
const addYears = (_date, numYears) => addMonths(_date, numYears * 12);

/**
 * Subtract years from date
 *
 * @param {Date} _date the date to adjust
 * @param {number} numYears the difference in years
 * @returns {Date} the adjusted date
 */
const subYears = (_date, numYears) => addYears(_date, -numYears);

/**
 * Set months of date
 *
 * @param {Date} _date the date to adjust
 * @param {number} month zero-indexed month to set
 * @returns {Date} the adjusted date
 */
const setMonth = (_date, month) => {
  const newDate = new Date(_date.getTime());
  newDate.setMonth(month);
  keepDateWithinMonth(newDate, month);
  return newDate;
};

/**
 * Set year of date
 *
 * @param {Date} _date the date to adjust
 * @param {number} year the year to set
 * @returns {Date} the adjusted date
 */
const setYear = (_date, year) => {
  const newDate = new Date(_date.getTime());
  const month = newDate.getMonth();
  newDate.setFullYear(year);
  keepDateWithinMonth(newDate, month);
  return newDate;
};

/**
 * Return the earliest date
 *
 * @param {Date} dateA date to compare
 * @param {Date} dateB date to compare
 * @returns {Date} the earliest date
 */
const min = (dateA, dateB) => {
  let newDate = dateA;
  if (dateB < dateA) {
    newDate = dateB;
  }
  return new Date(newDate.getTime());
};

/**
 * Return the latest date
 *
 * @param {Date} dateA date to compare
 * @param {Date} dateB date to compare
 * @returns {Date} the latest date
 */
const max = (dateA, dateB) => {
  let newDate = dateA;
  if (dateB > dateA) {
    newDate = dateB;
  }
  return new Date(newDate.getTime());
};

/**
 * Check if dates are the in the same year
 *
 * @param {Date} dateA date to compare
 * @param {Date} dateB date to compare
 * @returns {boolean} are dates in the same year
 */
const isSameYear = (dateA, dateB) => dateA && dateB && dateA.getFullYear() === dateB.getFullYear();

/**
 * Check if dates are the in the same month
 *
 * @param {Date} dateA date to compare
 * @param {Date} dateB date to compare
 * @returns {boolean} are dates in the same month
 */
const isSameMonth = (dateA, dateB) => isSameYear(dateA, dateB) && dateA.getMonth() === dateB.getMonth();

/**
 * Check if dates are the same date
 *
 * @param {Date} dateA the date to compare
 * @param {Date} dateA the date to compare
 * @returns {boolean} are dates the same date
 */
const isSameDay = (dateA, dateB) => isSameMonth(dateA, dateB) && dateA.getDate() === dateB.getDate();

/**
 * return a new date within minimum and maximum date
 *
 * @param {Date} date date to check
 * @param {Date} minDate minimum date to allow
 * @param {Date} maxDate maximum date to allow
 * @returns {Date} the date between min and max
 */
const keepDateBetweenMinAndMax = (date, minDate, maxDate) => {
  let newDate = date;
  if (date < minDate) {
    newDate = minDate;
  } else if (maxDate && date > maxDate) {
    newDate = maxDate;
  }
  return new Date(newDate.getTime());
};

/**
 * Check if dates is valid.
 *
 * @param {Date} date date to check
 * @param {Date} minDate minimum date to allow
 * @param {Date} maxDate maximum date to allow
 * @return {boolean} is there a day within the month within min and max dates
 */
const isDateWithinMinAndMax = (date, minDate, maxDate) => date >= minDate && (!maxDate || date <= maxDate);

/**
 * Check if dates month is invalid.
 *
 * @param {Date} date date to check
 * @param {Date} minDate minimum date to allow
 * @param {Date} maxDate maximum date to allow
 * @return {boolean} is the month outside min or max dates
 */
const isDatesMonthOutsideMinOrMax = (date, minDate, maxDate) => lastDayOfMonth(date) < minDate || maxDate && startOfMonth(date) > maxDate;

/**
 * Check if dates year is invalid.
 *
 * @param {Date} date date to check
 * @param {Date} minDate minimum date to allow
 * @param {Date} maxDate maximum date to allow
 * @return {boolean} is the month outside min or max dates
 */
const isDatesYearOutsideMinOrMax = (date, minDate, maxDate) => lastDayOfMonth(setMonth(date, 11)) < minDate || maxDate && startOfMonth(setMonth(date, 0)) > maxDate;

/**
 * Parse a date with format M-D-YY
 *
 * @param {string} dateString the date string to parse
 * @param {string} dateFormat the format of the date string
 * @param {boolean} adjustDate should the date be adjusted
 * @returns {Date} the parsed date
 */
const parseDateString = (dateString, dateFormat = INTERNAL_DATE_FORMAT, adjustDate = false) => {
  let date;
  let month;
  let day;
  let year;
  let parsed;
  if (dateString) {
    let monthStr;
    let dayStr;
    let yearStr;
    if (dateFormat === DEFAULT_EXTERNAL_DATE_FORMAT) {
      [monthStr, dayStr, yearStr] = dateString.split("/");
    } else {
      [yearStr, monthStr, dayStr] = dateString.split("-");
    }
    if (yearStr) {
      parsed = parseInt(yearStr, 10);
      if (!Number.isNaN(parsed)) {
        year = parsed;
        if (adjustDate) {
          year = Math.max(0, year);
          if (yearStr.length < 3) {
            const currentYear = today().getFullYear();
            const currentYearStub = currentYear - currentYear % 10 ** yearStr.length;
            year = currentYearStub + parsed;
          }
        }
      }
    }
    if (monthStr) {
      parsed = parseInt(monthStr, 10);
      if (!Number.isNaN(parsed)) {
        month = parsed;
        if (adjustDate) {
          month = Math.max(1, month);
          month = Math.min(12, month);
        }
      }
    }
    if (month && dayStr && year != null) {
      parsed = parseInt(dayStr, 10);
      if (!Number.isNaN(parsed)) {
        day = parsed;
        if (adjustDate) {
          const lastDayOfTheMonth = setDate(year, month, 0).getDate();
          day = Math.max(1, day);
          day = Math.min(lastDayOfTheMonth, day);
        }
      }
    }
    if (month && day && year != null) {
      date = setDate(year, month - 1, day);
    }
  }
  return date;
};

/**
 * Format a date to format MM-DD-YYYY
 *
 * @param {Date} date the date to format
 * @param {string} dateFormat the format of the date string
 * @returns {string} the formatted date string
 */
const formatDate = (date, dateFormat = INTERNAL_DATE_FORMAT) => {
  const padZeros = (value, length) => `0000${value}`.slice(-length);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  if (dateFormat === DEFAULT_EXTERNAL_DATE_FORMAT) {
    return [padZeros(month, 2), padZeros(day, 2), padZeros(year, 4)].join("/");
  }
  return [padZeros(year, 4), padZeros(month, 2), padZeros(day, 2)].join("-");
};

// #endregion Date Manipulation Functions

/**
 * Create a grid string from an array of html strings
 *
 * @param {string[]} htmlArray the array of html items
 * @param {number} rowSize the length of a row
 * @returns {string} the grid string
 */
const listToGridHtml = (htmlArray, rowSize) => {
  const grid = [];
  let row = [];
  let i = 0;
  while (i < htmlArray.length) {
    row = [];
    const tr = document.createElement("tr");
    while (i < htmlArray.length && row.length < rowSize) {
      const td = document.createElement("td");
      td.insertAdjacentElement("beforeend", htmlArray[i]);
      row.push(td);
      i += 1;
    }
    row.forEach(element => {
      tr.insertAdjacentElement("beforeend", element);
    });
    grid.push(tr);
  }
  return grid;
};
const createTableBody = grid => {
  const tableBody = document.createElement("tbody");
  grid.forEach(element => {
    tableBody.insertAdjacentElement("beforeend", element);
  });
  return tableBody;
};

/**
 * set the value of the element and dispatch a change event
 *
 * @param {HTMLInputElement} el The element to update
 * @param {string} value The new value of the element
 */
const changeElementValue = (el, value = "") => {
  const elementToChange = el;
  elementToChange.value = value;
  const event = new CustomEvent("change", {
    bubbles: true,
    cancelable: true,
    detail: {
      value
    }
  });
  elementToChange.dispatchEvent(event);
};

/**
 * The properties and elements within the date picker.
 * @typedef {Object} DatePickerContext
 * @property {HTMLDivElement} calendarEl
 * @property {HTMLElement} datePickerEl
 * @property {HTMLInputElement} internalInputEl
 * @property {HTMLInputElement} externalInputEl
 * @property {HTMLDivElement} statusEl
 * @property {HTMLDivElement} firstYearChunkEl
 * @property {Date} calendarDate
 * @property {Date} minDate
 * @property {Date} maxDate
 * @property {Date} selectedDate
 * @property {Date} rangeDate
 * @property {Date} defaultDate
 */

/**
 * Get an object of the properties and elements belonging directly to the given
 * date picker component.
 *
 * @param {HTMLElement} el the element within the date picker
 * @returns {DatePickerContext} elements
 */
const getDatePickerContext = el => {
  const datePickerEl = el.closest(DATE_PICKER);
  if (!datePickerEl) {
    throw new Error(`Element is missing outer ${DATE_PICKER}`);
  }
  const internalInputEl = datePickerEl.querySelector(DATE_PICKER_INTERNAL_INPUT);
  const externalInputEl = datePickerEl.querySelector(DATE_PICKER_EXTERNAL_INPUT);
  const calendarEl = datePickerEl.querySelector(DATE_PICKER_CALENDAR);
  const toggleBtnEl = datePickerEl.querySelector(DATE_PICKER_BUTTON);
  const statusEl = datePickerEl.querySelector(DATE_PICKER_STATUS);
  const firstYearChunkEl = datePickerEl.querySelector(CALENDAR_YEAR);
  const inputDate = parseDateString(externalInputEl.value, DEFAULT_EXTERNAL_DATE_FORMAT, true);
  const selectedDate = parseDateString(internalInputEl.value);
  const calendarDate = parseDateString(calendarEl.dataset.value);
  const minDate = parseDateString(datePickerEl.dataset.minDate);
  const maxDate = parseDateString(datePickerEl.dataset.maxDate);
  const rangeDate = parseDateString(datePickerEl.dataset.rangeDate);
  const defaultDate = parseDateString(datePickerEl.dataset.defaultDate);
  if (minDate && maxDate && minDate > maxDate) {
    throw new Error("Minimum date cannot be after maximum date");
  }
  return {
    calendarDate,
    minDate,
    toggleBtnEl,
    selectedDate,
    maxDate,
    firstYearChunkEl,
    datePickerEl,
    inputDate,
    internalInputEl,
    externalInputEl,
    calendarEl,
    rangeDate,
    defaultDate,
    statusEl
  };
};

/**
 * Disable the date picker component
 *
 * @param {HTMLElement} el An element within the date picker component
 */
const disable = el => {
  const {
    externalInputEl,
    toggleBtnEl
  } = getDatePickerContext(el);
  toggleBtnEl.disabled = true;
  externalInputEl.disabled = true;
};

/**
 * Check for aria-disabled on initialization
 *
 * @param {HTMLElement} el An element within the date picker component
 */
const ariaDisable = el => {
  const {
    externalInputEl,
    toggleBtnEl
  } = getDatePickerContext(el);
  toggleBtnEl.setAttribute("aria-disabled", true);
  externalInputEl.setAttribute("aria-disabled", true);
};

/**
 * Enable the date picker component
 *
 * @param {HTMLElement} el An element within the date picker component
 */
const enable = el => {
  const {
    externalInputEl,
    toggleBtnEl
  } = getDatePickerContext(el);
  toggleBtnEl.disabled = false;
  externalInputEl.disabled = false;
};

// #region Validation

/**
 * Validate the value in the input as a valid date of format M/D/YYYY
 *
 * @param {HTMLElement} el An element within the date picker component
 */
const isDateInputInvalid = el => {
  const {
    externalInputEl,
    minDate,
    maxDate
  } = getDatePickerContext(el);
  const dateString = externalInputEl.value;
  let isInvalid = false;
  if (dateString) {
    isInvalid = true;
    const dateStringParts = dateString.split("/");
    const [month, day, year] = dateStringParts.map(str => {
      let value;
      const parsed = parseInt(str, 10);
      if (!Number.isNaN(parsed)) value = parsed;
      return value;
    });
    if (month && day && year != null) {
      const checkDate = setDate(year, month - 1, day);
      if (checkDate.getMonth() === month - 1 && checkDate.getDate() === day && checkDate.getFullYear() === year && dateStringParts[2].length === 4 && isDateWithinMinAndMax(checkDate, minDate, maxDate)) {
        isInvalid = false;
      }
    }
  }
  return isInvalid;
};

/**
 * Validate the value in the input as a valid date of format M/D/YYYY
 *
 * @param {HTMLElement} el An element within the date picker component
 */
const validateDateInput = el => {
  const {
    externalInputEl
  } = getDatePickerContext(el);
  const isInvalid = isDateInputInvalid(externalInputEl);
  if (isInvalid && !externalInputEl.validationMessage) {
    externalInputEl.setCustomValidity(VALIDATION_MESSAGE);
  }
  if (!isInvalid && externalInputEl.validationMessage === VALIDATION_MESSAGE) {
    externalInputEl.setCustomValidity("");
  }
};

// #endregion Validation

/**
 * Enable the date picker component
 *
 * @param {HTMLElement} el An element within the date picker component
 */
const reconcileInputValues = el => {
  const {
    internalInputEl,
    inputDate
  } = getDatePickerContext(el);
  let newValue = "";
  if (inputDate && !isDateInputInvalid(el)) {
    newValue = formatDate(inputDate);
  }
  if (internalInputEl.value !== newValue) {
    changeElementValue(internalInputEl, newValue);
  }
};

/**
 * Select the value of the date picker inputs.
 *
 * @param {HTMLButtonElement} el An element within the date picker component
 * @param {string} dateString The date string to update in YYYY-MM-DD format
 */
const setCalendarValue = (el, dateString) => {
  const parsedDate = parseDateString(dateString);
  if (parsedDate) {
    const formattedDate = formatDate(parsedDate, DEFAULT_EXTERNAL_DATE_FORMAT);
    const {
      datePickerEl,
      internalInputEl,
      externalInputEl
    } = getDatePickerContext(el);
    changeElementValue(internalInputEl, dateString);
    changeElementValue(externalInputEl, formattedDate);
    validateDateInput(datePickerEl);
  }
};

/**
 * Enhance an input with the date picker elements
 *
 * @param {HTMLElement} el The initial wrapping element of the date picker component
 */
const enhanceDatePicker = el => {
  const datePickerEl = el.closest(DATE_PICKER);
  const {
    defaultValue
  } = datePickerEl.dataset;
  const internalInputEl = datePickerEl.querySelector(`input`);
  if (!internalInputEl) {
    throw new Error(`${DATE_PICKER} is missing inner input`);
  }
  if (internalInputEl.value) {
    internalInputEl.value = "";
  }
  const minDate = parseDateString(datePickerEl.dataset.minDate || internalInputEl.getAttribute("min"));
  datePickerEl.dataset.minDate = minDate ? formatDate(minDate) : DEFAULT_MIN_DATE;
  const maxDate = parseDateString(datePickerEl.dataset.maxDate || internalInputEl.getAttribute("max"));
  if (maxDate) {
    datePickerEl.dataset.maxDate = formatDate(maxDate);
  }
  const calendarWrapper = document.createElement("div");
  calendarWrapper.classList.add(DATE_PICKER_WRAPPER_CLASS);
  const externalInputEl = internalInputEl.cloneNode();
  externalInputEl.classList.add(DATE_PICKER_EXTERNAL_INPUT_CLASS);
  externalInputEl.type = "text";
  calendarWrapper.appendChild(externalInputEl);
  calendarWrapper.insertAdjacentHTML("beforeend", Sanitizer.escapeHTML`
    <button type="button" class="${DATE_PICKER_BUTTON_CLASS}" aria-haspopup="true" aria-label="Toggle calendar"></button>
    <div class="${DATE_PICKER_CALENDAR_CLASS}" role="application" hidden></div>
    <div class="usa-sr-only ${DATE_PICKER_STATUS_CLASS}" role="status" aria-live="polite"></div>`);
  internalInputEl.setAttribute("aria-hidden", "true");
  internalInputEl.setAttribute("tabindex", "-1");
  internalInputEl.style.display = "none";
  internalInputEl.classList.add(DATE_PICKER_INTERNAL_INPUT_CLASS);
  internalInputEl.removeAttribute("id");
  internalInputEl.removeAttribute("name");
  internalInputEl.required = false;
  datePickerEl.appendChild(calendarWrapper);
  datePickerEl.classList.add(DATE_PICKER_INITIALIZED_CLASS);
  if (defaultValue) {
    setCalendarValue(datePickerEl, defaultValue);
  }
  if (internalInputEl.disabled) {
    disable(datePickerEl);
    internalInputEl.disabled = false;
  }
  if (internalInputEl.hasAttribute("aria-disabled")) {
    ariaDisable(datePickerEl);
    internalInputEl.removeAttribute("aria-disabled");
  }
};

// #region Calendar - Date Selection View

/**
 * render the calendar.
 *
 * @param {HTMLElement} el An element within the date picker component
 * @param {Date} _dateToDisplay a date to render on the calendar
 * @returns {HTMLElement} a reference to the new calendar element
 */
const renderCalendar = (el, _dateToDisplay) => {
  const {
    datePickerEl,
    calendarEl,
    statusEl,
    selectedDate,
    maxDate,
    minDate,
    rangeDate
  } = getDatePickerContext(el);
  const todaysDate = today();
  let dateToDisplay = _dateToDisplay || todaysDate;
  const calendarWasHidden = calendarEl.hidden;
  const focusedDate = addDays(dateToDisplay, 0);
  const focusedMonth = dateToDisplay.getMonth();
  const focusedYear = dateToDisplay.getFullYear();
  const prevMonth = subMonths(dateToDisplay, 1);
  const nextMonth = addMonths(dateToDisplay, 1);
  const currentFormattedDate = formatDate(dateToDisplay);
  const firstOfMonth = startOfMonth(dateToDisplay);
  const prevButtonsDisabled = isSameMonth(dateToDisplay, minDate);
  const nextButtonsDisabled = isSameMonth(dateToDisplay, maxDate);
  const rangeConclusionDate = selectedDate || dateToDisplay;
  const rangeStartDate = rangeDate && min(rangeConclusionDate, rangeDate);
  const rangeEndDate = rangeDate && max(rangeConclusionDate, rangeDate);
  const withinRangeStartDate = rangeDate && addDays(rangeStartDate, 1);
  const withinRangeEndDate = rangeDate && subDays(rangeEndDate, 1);
  const monthLabel = MONTH_LABELS[focusedMonth];
  const generateDateHtml = dateToRender => {
    const classes = [CALENDAR_DATE_CLASS];
    const day = dateToRender.getDate();
    const month = dateToRender.getMonth();
    const year = dateToRender.getFullYear();
    const dayOfWeek = dateToRender.getDay();
    const formattedDate = formatDate(dateToRender);
    let tabindex = "-1";
    const isDisabled = !isDateWithinMinAndMax(dateToRender, minDate, maxDate);
    const isSelected = isSameDay(dateToRender, selectedDate);
    if (isSameMonth(dateToRender, prevMonth)) {
      classes.push(CALENDAR_DATE_PREVIOUS_MONTH_CLASS);
    }
    if (isSameMonth(dateToRender, focusedDate)) {
      classes.push(CALENDAR_DATE_CURRENT_MONTH_CLASS);
    }
    if (isSameMonth(dateToRender, nextMonth)) {
      classes.push(CALENDAR_DATE_NEXT_MONTH_CLASS);
    }
    if (isSelected) {
      classes.push(CALENDAR_DATE_SELECTED_CLASS);
    }
    if (isSameDay(dateToRender, todaysDate)) {
      classes.push(CALENDAR_DATE_TODAY_CLASS);
    }
    if (rangeDate) {
      if (isSameDay(dateToRender, rangeDate)) {
        classes.push(CALENDAR_DATE_RANGE_DATE_CLASS);
      }
      if (isSameDay(dateToRender, rangeStartDate)) {
        classes.push(CALENDAR_DATE_RANGE_DATE_START_CLASS);
      }
      if (isSameDay(dateToRender, rangeEndDate)) {
        classes.push(CALENDAR_DATE_RANGE_DATE_END_CLASS);
      }
      if (isDateWithinMinAndMax(dateToRender, withinRangeStartDate, withinRangeEndDate)) {
        classes.push(CALENDAR_DATE_WITHIN_RANGE_CLASS);
      }
    }
    if (isSameDay(dateToRender, focusedDate)) {
      tabindex = "0";
      classes.push(CALENDAR_DATE_FOCUSED_CLASS);
    }
    const monthStr = MONTH_LABELS[month];
    const dayStr = DAY_OF_WEEK_LABELS[dayOfWeek];
    const btn = document.createElement("button");
    btn.setAttribute("type", "button");
    btn.setAttribute("tabindex", tabindex);
    btn.setAttribute("class", classes.join(" "));
    btn.setAttribute("data-day", day);
    btn.setAttribute("data-month", month + 1);
    btn.setAttribute("data-year", year);
    btn.setAttribute("data-value", formattedDate);
    btn.setAttribute("aria-label", Sanitizer.escapeHTML`${day} ${monthStr} ${year} ${dayStr}`);
    btn.setAttribute("aria-selected", isSelected ? "true" : "false");
    if (isDisabled === true) {
      btn.disabled = true;
    }
    btn.textContent = day;
    return btn;
  };

  // set date to first rendered day
  dateToDisplay = startOfWeek(firstOfMonth);
  const days = [];
  while (days.length < 28 || dateToDisplay.getMonth() === focusedMonth || days.length % 7 !== 0) {
    days.push(generateDateHtml(dateToDisplay));
    dateToDisplay = addDays(dateToDisplay, 1);
  }
  const datesGrid = listToGridHtml(days, 7);
  const newCalendar = calendarEl.cloneNode();
  newCalendar.dataset.value = currentFormattedDate;
  newCalendar.style.top = `${datePickerEl.offsetHeight}px`;
  newCalendar.hidden = false;
  newCalendar.innerHTML = Sanitizer.escapeHTML`
    <div tabindex="-1" class="${CALENDAR_DATE_PICKER_CLASS}">
      <div class="${CALENDAR_ROW_CLASS}">
        <div class="${CALENDAR_CELL_CLASS} ${CALENDAR_CELL_CENTER_ITEMS_CLASS}">
          <button
            type="button"
            class="${CALENDAR_PREVIOUS_YEAR_CLASS}"
            aria-label="Navigate back one year"
            ${prevButtonsDisabled ? `disabled="disabled"` : ""}
          ></button>
        </div>
        <div class="${CALENDAR_CELL_CLASS} ${CALENDAR_CELL_CENTER_ITEMS_CLASS}">
          <button
            type="button"
            class="${CALENDAR_PREVIOUS_MONTH_CLASS}"
            aria-label="Navigate back one month"
            ${prevButtonsDisabled ? `disabled="disabled"` : ""}
          ></button>
        </div>
        <div class="${CALENDAR_CELL_CLASS} ${CALENDAR_MONTH_LABEL_CLASS}">
          <button
            type="button"
            class="${CALENDAR_MONTH_SELECTION_CLASS}" aria-label="${monthLabel}. Select month"
          >${monthLabel}</button>
          <button
            type="button"
            class="${CALENDAR_YEAR_SELECTION_CLASS}" aria-label="${focusedYear}. Select year"
          >${focusedYear}</button>
        </div>
        <div class="${CALENDAR_CELL_CLASS} ${CALENDAR_CELL_CENTER_ITEMS_CLASS}">
          <button
            type="button"
            class="${CALENDAR_NEXT_MONTH_CLASS}"
            aria-label="Navigate forward one month"
            ${nextButtonsDisabled ? `disabled="disabled"` : ""}
          ></button>
        </div>
        <div class="${CALENDAR_CELL_CLASS} ${CALENDAR_CELL_CENTER_ITEMS_CLASS}">
          <button
            type="button"
            class="${CALENDAR_NEXT_YEAR_CLASS}"
            aria-label="Navigate forward one year"
            ${nextButtonsDisabled ? `disabled="disabled"` : ""}
          ></button>
        </div>
      </div>
    </div>
    `;
  const table = document.createElement("table");
  table.setAttribute("class", CALENDAR_TABLE_CLASS);
  const tableHead = document.createElement("thead");
  table.insertAdjacentElement("beforeend", tableHead);
  const tableHeadRow = document.createElement("tr");
  tableHead.insertAdjacentElement("beforeend", tableHeadRow);
  const daysOfWeek = {
    Sunday: "S",
    Monday: "M",
    Tuesday: "T",
    Wednesday: "W",
    Thursday: "Th",
    Friday: "Fr",
    Saturday: "S"
  };
  Object.keys(daysOfWeek).forEach(key => {
    const th = document.createElement("th");
    th.setAttribute("class", CALENDAR_DAY_OF_WEEK_CLASS);
    th.setAttribute("scope", "col");
    th.setAttribute("aria-label", key);
    th.textContent = daysOfWeek[key];
    tableHeadRow.insertAdjacentElement("beforeend", th);
  });
  const tableBody = createTableBody(datesGrid);
  table.insertAdjacentElement("beforeend", tableBody);

  // Container for Years, Months, and Days
  const datePickerCalendarContainer = newCalendar.querySelector(CALENDAR_DATE_PICKER);
  datePickerCalendarContainer.insertAdjacentElement("beforeend", table);
  calendarEl.parentNode.replaceChild(newCalendar, calendarEl);
  datePickerEl.classList.add(DATE_PICKER_ACTIVE_CLASS);
  const statuses = [];
  if (isSameDay(selectedDate, focusedDate)) {
    statuses.push("Selected date");
  }
  if (calendarWasHidden) {
    statuses.push("You can navigate by day using left and right arrows", "Weeks by using up and down arrows", "Months by using page up and page down keys", "Years by using shift plus page up and shift plus page down", "Home and end keys navigate to the beginning and end of a week");
    statusEl.textContent = "";
  } else {
    statuses.push(`${monthLabel} ${focusedYear}`);
  }
  statusEl.textContent = statuses.join(". ");
  return newCalendar;
};

/**
 * Navigate back one year and display the calendar.
 *
 * @param {HTMLButtonElement} _buttonEl An element within the date picker component
 */
const displayPreviousYear = _buttonEl => {
  if (_buttonEl.disabled) return;
  const {
    calendarEl,
    calendarDate,
    minDate,
    maxDate
  } = getDatePickerContext(_buttonEl);
  let date = subYears(calendarDate, 1);
  date = keepDateBetweenMinAndMax(date, minDate, maxDate);
  const newCalendar = renderCalendar(calendarEl, date);
  let nextToFocus = newCalendar.querySelector(CALENDAR_PREVIOUS_YEAR);
  if (nextToFocus.disabled) {
    nextToFocus = newCalendar.querySelector(CALENDAR_DATE_PICKER);
  }
  nextToFocus.focus();
};

/**
 * Navigate back one month and display the calendar.
 *
 * @param {HTMLButtonElement} _buttonEl An element within the date picker component
 */
const displayPreviousMonth = _buttonEl => {
  if (_buttonEl.disabled) return;
  const {
    calendarEl,
    calendarDate,
    minDate,
    maxDate
  } = getDatePickerContext(_buttonEl);
  let date = subMonths(calendarDate, 1);
  date = keepDateBetweenMinAndMax(date, minDate, maxDate);
  const newCalendar = renderCalendar(calendarEl, date);
  let nextToFocus = newCalendar.querySelector(CALENDAR_PREVIOUS_MONTH);
  if (nextToFocus.disabled) {
    nextToFocus = newCalendar.querySelector(CALENDAR_DATE_PICKER);
  }
  nextToFocus.focus();
};

/**
 * Navigate forward one month and display the calendar.
 *
 * @param {HTMLButtonElement} _buttonEl An element within the date picker component
 */
const displayNextMonth = _buttonEl => {
  if (_buttonEl.disabled) return;
  const {
    calendarEl,
    calendarDate,
    minDate,
    maxDate
  } = getDatePickerContext(_buttonEl);
  let date = addMonths(calendarDate, 1);
  date = keepDateBetweenMinAndMax(date, minDate, maxDate);
  const newCalendar = renderCalendar(calendarEl, date);
  let nextToFocus = newCalendar.querySelector(CALENDAR_NEXT_MONTH);
  if (nextToFocus.disabled) {
    nextToFocus = newCalendar.querySelector(CALENDAR_DATE_PICKER);
  }
  nextToFocus.focus();
};

/**
 * Navigate forward one year and display the calendar.
 *
 * @param {HTMLButtonElement} _buttonEl An element within the date picker component
 */
const displayNextYear = _buttonEl => {
  if (_buttonEl.disabled) return;
  const {
    calendarEl,
    calendarDate,
    minDate,
    maxDate
  } = getDatePickerContext(_buttonEl);
  let date = addYears(calendarDate, 1);
  date = keepDateBetweenMinAndMax(date, minDate, maxDate);
  const newCalendar = renderCalendar(calendarEl, date);
  let nextToFocus = newCalendar.querySelector(CALENDAR_NEXT_YEAR);
  if (nextToFocus.disabled) {
    nextToFocus = newCalendar.querySelector(CALENDAR_DATE_PICKER);
  }
  nextToFocus.focus();
};

/**
 * Hide the calendar of a date picker component.
 *
 * @param {HTMLElement} el An element within the date picker component
 */
const hideCalendar = el => {
  const {
    datePickerEl,
    calendarEl,
    statusEl
  } = getDatePickerContext(el);
  datePickerEl.classList.remove(DATE_PICKER_ACTIVE_CLASS);
  calendarEl.hidden = true;
  statusEl.textContent = "";
};

/**
 * Select a date within the date picker component.
 *
 * @param {HTMLButtonElement} calendarDateEl A date element within the date picker component
 */
const selectDate = calendarDateEl => {
  if (calendarDateEl.disabled) return;
  const {
    datePickerEl,
    externalInputEl
  } = getDatePickerContext(calendarDateEl);
  setCalendarValue(calendarDateEl, calendarDateEl.dataset.value);
  hideCalendar(datePickerEl);
  externalInputEl.focus();
};

/**
 * Toggle the calendar.
 *
 * @param {HTMLButtonElement} el An element within the date picker component
 */
const toggleCalendar = el => {
  if (el.disabled) return;
  const {
    calendarEl,
    inputDate,
    minDate,
    maxDate,
    defaultDate
  } = getDatePickerContext(el);
  if (calendarEl.hidden) {
    const dateToDisplay = keepDateBetweenMinAndMax(inputDate || defaultDate || today(), minDate, maxDate);
    const newCalendar = renderCalendar(calendarEl, dateToDisplay);
    newCalendar.querySelector(CALENDAR_DATE_FOCUSED).focus();
  } else {
    hideCalendar(el);
  }
};

/**
 * Update the calendar when visible.
 *
 * @param {HTMLElement} el an element within the date picker
 */
const updateCalendarIfVisible = el => {
  const {
    calendarEl,
    inputDate,
    minDate,
    maxDate
  } = getDatePickerContext(el);
  const calendarShown = !calendarEl.hidden;
  if (calendarShown && inputDate) {
    const dateToDisplay = keepDateBetweenMinAndMax(inputDate, minDate, maxDate);
    renderCalendar(calendarEl, dateToDisplay);
  }
};

// #endregion Calendar - Date Selection View

// #region Calendar - Month Selection View
/**
 * Display the month selection screen in the date picker.
 *
 * @param {HTMLButtonElement} el An element within the date picker component
 * @returns {HTMLElement} a reference to the new calendar element
 */
const displayMonthSelection = (el, monthToDisplay) => {
  const {
    calendarEl,
    statusEl,
    calendarDate,
    minDate,
    maxDate
  } = getDatePickerContext(el);
  const selectedMonth = calendarDate.getMonth();
  const focusedMonth = monthToDisplay == null ? selectedMonth : monthToDisplay;
  const months = MONTH_LABELS.map((month, index) => {
    const monthToCheck = setMonth(calendarDate, index);
    const isDisabled = isDatesMonthOutsideMinOrMax(monthToCheck, minDate, maxDate);
    let tabindex = "-1";
    const classes = [CALENDAR_MONTH_CLASS];
    const isSelected = index === selectedMonth;
    if (index === focusedMonth) {
      tabindex = "0";
      classes.push(CALENDAR_MONTH_FOCUSED_CLASS);
    }
    if (isSelected) {
      classes.push(CALENDAR_MONTH_SELECTED_CLASS);
    }
    const btn = document.createElement("button");
    btn.setAttribute("type", "button");
    btn.setAttribute("tabindex", tabindex);
    btn.setAttribute("class", classes.join(" "));
    btn.setAttribute("data-value", index);
    btn.setAttribute("data-label", month);
    btn.setAttribute("aria-selected", isSelected ? "true" : "false");
    if (isDisabled === true) {
      btn.disabled = true;
    }
    btn.textContent = month;
    return btn;
  });
  const monthsHtml = document.createElement("div");
  monthsHtml.setAttribute("tabindex", "-1");
  monthsHtml.setAttribute("class", CALENDAR_MONTH_PICKER_CLASS);
  const table = document.createElement("table");
  table.setAttribute("class", CALENDAR_TABLE_CLASS);
  table.setAttribute("role", "presentation");
  const monthsGrid = listToGridHtml(months, 3);
  const tableBody = createTableBody(monthsGrid);
  table.insertAdjacentElement("beforeend", tableBody);
  monthsHtml.insertAdjacentElement("beforeend", table);
  const newCalendar = calendarEl.cloneNode();
  newCalendar.insertAdjacentElement("beforeend", monthsHtml);
  calendarEl.parentNode.replaceChild(newCalendar, calendarEl);
  statusEl.textContent = "Select a month.";
  return newCalendar;
};

/**
 * Select a month in the date picker component.
 *
 * @param {HTMLButtonElement} monthEl An month element within the date picker component
 */
const selectMonth = monthEl => {
  if (monthEl.disabled) return;
  const {
    calendarEl,
    calendarDate,
    minDate,
    maxDate
  } = getDatePickerContext(monthEl);
  const selectedMonth = parseInt(monthEl.dataset.value, 10);
  let date = setMonth(calendarDate, selectedMonth);
  date = keepDateBetweenMinAndMax(date, minDate, maxDate);
  const newCalendar = renderCalendar(calendarEl, date);
  newCalendar.querySelector(CALENDAR_DATE_FOCUSED).focus();
};

// #endregion Calendar - Month Selection View

// #region Calendar - Year Selection View

/**
 * Display the year selection screen in the date picker.
 *
 * @param {HTMLButtonElement} el An element within the date picker component
 * @param {number} yearToDisplay year to display in year selection
 * @returns {HTMLElement} a reference to the new calendar element
 */
const displayYearSelection = (el, yearToDisplay) => {
  const {
    calendarEl,
    statusEl,
    calendarDate,
    minDate,
    maxDate
  } = getDatePickerContext(el);
  const selectedYear = calendarDate.getFullYear();
  const focusedYear = yearToDisplay == null ? selectedYear : yearToDisplay;
  let yearToChunk = focusedYear;
  yearToChunk -= yearToChunk % YEAR_CHUNK;
  yearToChunk = Math.max(0, yearToChunk);
  const prevYearChunkDisabled = isDatesYearOutsideMinOrMax(setYear(calendarDate, yearToChunk - 1), minDate, maxDate);
  const nextYearChunkDisabled = isDatesYearOutsideMinOrMax(setYear(calendarDate, yearToChunk + YEAR_CHUNK), minDate, maxDate);
  const years = [];
  let yearIndex = yearToChunk;
  while (years.length < YEAR_CHUNK) {
    const isDisabled = isDatesYearOutsideMinOrMax(setYear(calendarDate, yearIndex), minDate, maxDate);
    let tabindex = "-1";
    const classes = [CALENDAR_YEAR_CLASS];
    const isSelected = yearIndex === selectedYear;
    if (yearIndex === focusedYear) {
      tabindex = "0";
      classes.push(CALENDAR_YEAR_FOCUSED_CLASS);
    }
    if (isSelected) {
      classes.push(CALENDAR_YEAR_SELECTED_CLASS);
    }
    const btn = document.createElement("button");
    btn.setAttribute("type", "button");
    btn.setAttribute("tabindex", tabindex);
    btn.setAttribute("class", classes.join(" "));
    btn.setAttribute("data-value", yearIndex);
    btn.setAttribute("aria-selected", isSelected ? "true" : "false");
    if (isDisabled === true) {
      btn.disabled = true;
    }
    btn.textContent = yearIndex;
    years.push(btn);
    yearIndex += 1;
  }
  const newCalendar = calendarEl.cloneNode();

  // create the years calendar wrapper
  const yearsCalendarWrapper = document.createElement("div");
  yearsCalendarWrapper.setAttribute("tabindex", "-1");
  yearsCalendarWrapper.setAttribute("class", CALENDAR_YEAR_PICKER_CLASS);

  // create table parent
  const yearsTableParent = document.createElement("table");
  yearsTableParent.setAttribute("class", CALENDAR_TABLE_CLASS);

  // create table body and table row
  const yearsHTMLTableBody = document.createElement("tbody");
  const yearsHTMLTableBodyRow = document.createElement("tr");

  // create previous button
  const previousYearsBtn = document.createElement("button");
  previousYearsBtn.setAttribute("type", "button");
  previousYearsBtn.setAttribute("class", CALENDAR_PREVIOUS_YEAR_CHUNK_CLASS);
  previousYearsBtn.setAttribute("aria-label", `Navigate back ${YEAR_CHUNK} years`);
  if (prevYearChunkDisabled === true) {
    previousYearsBtn.disabled = true;
  }
  previousYearsBtn.innerHTML = Sanitizer.escapeHTML`&nbsp`;

  // create next button
  const nextYearsBtn = document.createElement("button");
  nextYearsBtn.setAttribute("type", "button");
  nextYearsBtn.setAttribute("class", CALENDAR_NEXT_YEAR_CHUNK_CLASS);
  nextYearsBtn.setAttribute("aria-label", `Navigate forward ${YEAR_CHUNK} years`);
  if (nextYearChunkDisabled === true) {
    nextYearsBtn.disabled = true;
  }
  nextYearsBtn.innerHTML = Sanitizer.escapeHTML`&nbsp`;

  // create the actual years table
  const yearsTable = document.createElement("table");
  yearsTable.setAttribute("class", CALENDAR_TABLE_CLASS);
  yearsTable.setAttribute("role", "presentation");

  // create the years child table
  const yearsGrid = listToGridHtml(years, 3);
  const yearsTableBody = createTableBody(yearsGrid);

  // append the grid to the years child table
  yearsTable.insertAdjacentElement("beforeend", yearsTableBody);

  // create the prev button td and append the prev button
  const yearsHTMLTableBodyDetailPrev = document.createElement("td");
  yearsHTMLTableBodyDetailPrev.insertAdjacentElement("beforeend", previousYearsBtn);

  // create the years td and append the years child table
  const yearsHTMLTableBodyYearsDetail = document.createElement("td");
  yearsHTMLTableBodyYearsDetail.setAttribute("colspan", "3");
  yearsHTMLTableBodyYearsDetail.insertAdjacentElement("beforeend", yearsTable);

  // create the next button td and append the next button
  const yearsHTMLTableBodyDetailNext = document.createElement("td");
  yearsHTMLTableBodyDetailNext.insertAdjacentElement("beforeend", nextYearsBtn);

  // append the three td to the years child table row
  yearsHTMLTableBodyRow.insertAdjacentElement("beforeend", yearsHTMLTableBodyDetailPrev);
  yearsHTMLTableBodyRow.insertAdjacentElement("beforeend", yearsHTMLTableBodyYearsDetail);
  yearsHTMLTableBodyRow.insertAdjacentElement("beforeend", yearsHTMLTableBodyDetailNext);

  // append the table row to the years child table body
  yearsHTMLTableBody.insertAdjacentElement("beforeend", yearsHTMLTableBodyRow);

  // append the years table body to the years parent table
  yearsTableParent.insertAdjacentElement("beforeend", yearsHTMLTableBody);

  // append the parent table to the calendar wrapper
  yearsCalendarWrapper.insertAdjacentElement("beforeend", yearsTableParent);

  // append the years calender to the new calendar
  newCalendar.insertAdjacentElement("beforeend", yearsCalendarWrapper);

  // replace calendar
  calendarEl.parentNode.replaceChild(newCalendar, calendarEl);
  statusEl.textContent = Sanitizer.escapeHTML`Showing years ${yearToChunk} to ${yearToChunk + YEAR_CHUNK - 1}. Select a year.`;
  return newCalendar;
};

/**
 * Navigate back by years and display the year selection screen.
 *
 * @param {HTMLButtonElement} el An element within the date picker component
 */
const displayPreviousYearChunk = el => {
  if (el.disabled) return;
  const {
    calendarEl,
    calendarDate,
    minDate,
    maxDate
  } = getDatePickerContext(el);
  const yearEl = calendarEl.querySelector(CALENDAR_YEAR_FOCUSED);
  const selectedYear = parseInt(yearEl.textContent, 10);
  let adjustedYear = selectedYear - YEAR_CHUNK;
  adjustedYear = Math.max(0, adjustedYear);
  const date = setYear(calendarDate, adjustedYear);
  const cappedDate = keepDateBetweenMinAndMax(date, minDate, maxDate);
  const newCalendar = displayYearSelection(calendarEl, cappedDate.getFullYear());
  let nextToFocus = newCalendar.querySelector(CALENDAR_PREVIOUS_YEAR_CHUNK);
  if (nextToFocus.disabled) {
    nextToFocus = newCalendar.querySelector(CALENDAR_YEAR_PICKER);
  }
  nextToFocus.focus();
};

/**
 * Navigate forward by years and display the year selection screen.
 *
 * @param {HTMLButtonElement} el An element within the date picker component
 */
const displayNextYearChunk = el => {
  if (el.disabled) return;
  const {
    calendarEl,
    calendarDate,
    minDate,
    maxDate
  } = getDatePickerContext(el);
  const yearEl = calendarEl.querySelector(CALENDAR_YEAR_FOCUSED);
  const selectedYear = parseInt(yearEl.textContent, 10);
  let adjustedYear = selectedYear + YEAR_CHUNK;
  adjustedYear = Math.max(0, adjustedYear);
  const date = setYear(calendarDate, adjustedYear);
  const cappedDate = keepDateBetweenMinAndMax(date, minDate, maxDate);
  const newCalendar = displayYearSelection(calendarEl, cappedDate.getFullYear());
  let nextToFocus = newCalendar.querySelector(CALENDAR_NEXT_YEAR_CHUNK);
  if (nextToFocus.disabled) {
    nextToFocus = newCalendar.querySelector(CALENDAR_YEAR_PICKER);
  }
  nextToFocus.focus();
};

/**
 * Select a year in the date picker component.
 *
 * @param {HTMLButtonElement} yearEl A year element within the date picker component
 */
const selectYear = yearEl => {
  if (yearEl.disabled) return;
  const {
    calendarEl,
    calendarDate,
    minDate,
    maxDate
  } = getDatePickerContext(yearEl);
  const selectedYear = parseInt(yearEl.innerHTML, 10);
  let date = setYear(calendarDate, selectedYear);
  date = keepDateBetweenMinAndMax(date, minDate, maxDate);
  const newCalendar = renderCalendar(calendarEl, date);
  newCalendar.querySelector(CALENDAR_DATE_FOCUSED).focus();
};

// #endregion Calendar - Year Selection View

// #region Calendar Event Handling

/**
 * Hide the calendar.
 *
 * @param {KeyboardEvent} event the keydown event
 */
const handleEscapeFromCalendar = event => {
  const {
    datePickerEl,
    externalInputEl
  } = getDatePickerContext(event.target);
  hideCalendar(datePickerEl);
  externalInputEl.focus();
  event.preventDefault();
};

// #endregion Calendar Event Handling

// #region Calendar Date Event Handling

/**
 * Adjust the date and display the calendar if needed.
 *
 * @param {function} adjustDateFn function that returns the adjusted date
 */
const adjustCalendar = adjustDateFn => event => {
  const {
    calendarEl,
    calendarDate,
    minDate,
    maxDate
  } = getDatePickerContext(event.target);
  const date = adjustDateFn(calendarDate);
  const cappedDate = keepDateBetweenMinAndMax(date, minDate, maxDate);
  if (!isSameDay(calendarDate, cappedDate)) {
    const newCalendar = renderCalendar(calendarEl, cappedDate);
    newCalendar.querySelector(CALENDAR_DATE_FOCUSED).focus();
  }
  event.preventDefault();
};

/**
 * Navigate back one week and display the calendar.
 *
 * @param {KeyboardEvent} event the keydown event
 */
const handleUpFromDate = adjustCalendar(date => subWeeks(date, 1));

/**
 * Navigate forward one week and display the calendar.
 *
 * @param {KeyboardEvent} event the keydown event
 */
const handleDownFromDate = adjustCalendar(date => addWeeks(date, 1));

/**
 * Navigate back one day and display the calendar.
 *
 * @param {KeyboardEvent} event the keydown event
 */
const handleLeftFromDate = adjustCalendar(date => subDays(date, 1));

/**
 * Navigate forward one day and display the calendar.
 *
 * @param {KeyboardEvent} event the keydown event
 */
const handleRightFromDate = adjustCalendar(date => addDays(date, 1));

/**
 * Navigate to the start of the week and display the calendar.
 *
 * @param {KeyboardEvent} event the keydown event
 */
const handleHomeFromDate = adjustCalendar(date => startOfWeek(date));

/**
 * Navigate to the end of the week and display the calendar.
 *
 * @param {KeyboardEvent} event the keydown event
 */
const handleEndFromDate = adjustCalendar(date => endOfWeek(date));

/**
 * Navigate forward one month and display the calendar.
 *
 * @param {KeyboardEvent} event the keydown event
 */
const handlePageDownFromDate = adjustCalendar(date => addMonths(date, 1));

/**
 * Navigate back one month and display the calendar.
 *
 * @param {KeyboardEvent} event the keydown event
 */
const handlePageUpFromDate = adjustCalendar(date => subMonths(date, 1));

/**
 * Navigate forward one year and display the calendar.
 *
 * @param {KeyboardEvent} event the keydown event
 */
const handleShiftPageDownFromDate = adjustCalendar(date => addYears(date, 1));

/**
 * Navigate back one year and display the calendar.
 *
 * @param {KeyboardEvent} event the keydown event
 */
const handleShiftPageUpFromDate = adjustCalendar(date => subYears(date, 1));

/**
 * display the calendar for the mouseover date.
 *
 * @param {MouseEvent} event The mouseover event
 * @param {HTMLButtonElement} dateEl A date element within the date picker component
 */
const handleMouseoverFromDate = dateEl => {
  if (dateEl.disabled) return;
  const calendarEl = dateEl.closest(DATE_PICKER_CALENDAR);
  const currentCalendarDate = calendarEl.dataset.value;
  const hoverDate = dateEl.dataset.value;
  if (hoverDate === currentCalendarDate) return;
  const dateToDisplay = parseDateString(hoverDate);
  const newCalendar = renderCalendar(calendarEl, dateToDisplay);
  newCalendar.querySelector(CALENDAR_DATE_FOCUSED).focus();
};

// #endregion Calendar Date Event Handling

// #region Calendar Month Event Handling

/**
 * Adjust the month and display the month selection screen if needed.
 *
 * @param {function} adjustMonthFn function that returns the adjusted month
 */
const adjustMonthSelectionScreen = adjustMonthFn => event => {
  const monthEl = event.target;
  const selectedMonth = parseInt(monthEl.dataset.value, 10);
  const {
    calendarEl,
    calendarDate,
    minDate,
    maxDate
  } = getDatePickerContext(monthEl);
  const currentDate = setMonth(calendarDate, selectedMonth);
  let adjustedMonth = adjustMonthFn(selectedMonth);
  adjustedMonth = Math.max(0, Math.min(11, adjustedMonth));
  const date = setMonth(calendarDate, adjustedMonth);
  const cappedDate = keepDateBetweenMinAndMax(date, minDate, maxDate);
  if (!isSameMonth(currentDate, cappedDate)) {
    const newCalendar = displayMonthSelection(calendarEl, cappedDate.getMonth());
    newCalendar.querySelector(CALENDAR_MONTH_FOCUSED).focus();
  }
  event.preventDefault();
};

/**
 * Navigate back three months and display the month selection screen.
 *
 * @param {KeyboardEvent} event the keydown event
 */
const handleUpFromMonth = adjustMonthSelectionScreen(month => month - 3);

/**
 * Navigate forward three months and display the month selection screen.
 *
 * @param {KeyboardEvent} event the keydown event
 */
const handleDownFromMonth = adjustMonthSelectionScreen(month => month + 3);

/**
 * Navigate back one month and display the month selection screen.
 *
 * @param {KeyboardEvent} event the keydown event
 */
const handleLeftFromMonth = adjustMonthSelectionScreen(month => month - 1);

/**
 * Navigate forward one month and display the month selection screen.
 *
 * @param {KeyboardEvent} event the keydown event
 */
const handleRightFromMonth = adjustMonthSelectionScreen(month => month + 1);

/**
 * Navigate to the start of the row of months and display the month selection screen.
 *
 * @param {KeyboardEvent} event the keydown event
 */
const handleHomeFromMonth = adjustMonthSelectionScreen(month => month - month % 3);

/**
 * Navigate to the end of the row of months and display the month selection screen.
 *
 * @param {KeyboardEvent} event the keydown event
 */
const handleEndFromMonth = adjustMonthSelectionScreen(month => month + 2 - month % 3);

/**
 * Navigate to the last month (December) and display the month selection screen.
 *
 * @param {KeyboardEvent} event the keydown event
 */
const handlePageDownFromMonth = adjustMonthSelectionScreen(() => 11);

/**
 * Navigate to the first month (January) and display the month selection screen.
 *
 * @param {KeyboardEvent} event the keydown event
 */
const handlePageUpFromMonth = adjustMonthSelectionScreen(() => 0);

/**
 * update the focus on a month when the mouse moves.
 *
 * @param {MouseEvent} event The mouseover event
 * @param {HTMLButtonElement} monthEl A month element within the date picker component
 */
const handleMouseoverFromMonth = monthEl => {
  if (monthEl.disabled) return;
  if (monthEl.classList.contains(CALENDAR_MONTH_FOCUSED_CLASS)) return;
  const focusMonth = parseInt(monthEl.dataset.value, 10);
  const newCalendar = displayMonthSelection(monthEl, focusMonth);
  newCalendar.querySelector(CALENDAR_MONTH_FOCUSED).focus();
};

// #endregion Calendar Month Event Handling

// #region Calendar Year Event Handling

/**
 * Adjust the year and display the year selection screen if needed.
 *
 * @param {function} adjustYearFn function that returns the adjusted year
 */
const adjustYearSelectionScreen = adjustYearFn => event => {
  const yearEl = event.target;
  const selectedYear = parseInt(yearEl.dataset.value, 10);
  const {
    calendarEl,
    calendarDate,
    minDate,
    maxDate
  } = getDatePickerContext(yearEl);
  const currentDate = setYear(calendarDate, selectedYear);
  let adjustedYear = adjustYearFn(selectedYear);
  adjustedYear = Math.max(0, adjustedYear);
  const date = setYear(calendarDate, adjustedYear);
  const cappedDate = keepDateBetweenMinAndMax(date, minDate, maxDate);
  if (!isSameYear(currentDate, cappedDate)) {
    const newCalendar = displayYearSelection(calendarEl, cappedDate.getFullYear());
    newCalendar.querySelector(CALENDAR_YEAR_FOCUSED).focus();
  }
  event.preventDefault();
};

/**
 * Navigate back three years and display the year selection screen.
 *
 * @param {KeyboardEvent} event the keydown event
 */
const handleUpFromYear = adjustYearSelectionScreen(year => year - 3);

/**
 * Navigate forward three years and display the year selection screen.
 *
 * @param {KeyboardEvent} event the keydown event
 */
const handleDownFromYear = adjustYearSelectionScreen(year => year + 3);

/**
 * Navigate back one year and display the year selection screen.
 *
 * @param {KeyboardEvent} event the keydown event
 */
const handleLeftFromYear = adjustYearSelectionScreen(year => year - 1);

/**
 * Navigate forward one year and display the year selection screen.
 *
 * @param {KeyboardEvent} event the keydown event
 */
const handleRightFromYear = adjustYearSelectionScreen(year => year + 1);

/**
 * Navigate to the start of the row of years and display the year selection screen.
 *
 * @param {KeyboardEvent} event the keydown event
 */
const handleHomeFromYear = adjustYearSelectionScreen(year => year - year % 3);

/**
 * Navigate to the end of the row of years and display the year selection screen.
 *
 * @param {KeyboardEvent} event the keydown event
 */
const handleEndFromYear = adjustYearSelectionScreen(year => year + 2 - year % 3);

/**
 * Navigate to back 12 years and display the year selection screen.
 *
 * @param {KeyboardEvent} event the keydown event
 */
const handlePageUpFromYear = adjustYearSelectionScreen(year => year - YEAR_CHUNK);

/**
 * Navigate forward 12 years and display the year selection screen.
 *
 * @param {KeyboardEvent} event the keydown event
 */
const handlePageDownFromYear = adjustYearSelectionScreen(year => year + YEAR_CHUNK);

/**
 * update the focus on a year when the mouse moves.
 *
 * @param {MouseEvent} event The mouseover event
 * @param {HTMLButtonElement} dateEl A year element within the date picker component
 */
const handleMouseoverFromYear = yearEl => {
  if (yearEl.disabled) return;
  if (yearEl.classList.contains(CALENDAR_YEAR_FOCUSED_CLASS)) return;
  const focusYear = parseInt(yearEl.dataset.value, 10);
  const newCalendar = displayYearSelection(yearEl, focusYear);
  newCalendar.querySelector(CALENDAR_YEAR_FOCUSED).focus();
};

// #endregion Calendar Year Event Handling

// #region Focus Handling Event Handling

const tabHandler = focusable => {
  const getFocusableContext = el => {
    const {
      calendarEl
    } = getDatePickerContext(el);
    const focusableElements = select(focusable, calendarEl);
    const firstTabIndex = 0;
    const lastTabIndex = focusableElements.length - 1;
    const firstTabStop = focusableElements[firstTabIndex];
    const lastTabStop = focusableElements[lastTabIndex];
    const focusIndex = focusableElements.indexOf(activeElement());
    const isLastTab = focusIndex === lastTabIndex;
    const isFirstTab = focusIndex === firstTabIndex;
    const isNotFound = focusIndex === -1;
    return {
      focusableElements,
      isNotFound,
      firstTabStop,
      isFirstTab,
      lastTabStop,
      isLastTab
    };
  };
  return {
    tabAhead(event) {
      const {
        firstTabStop,
        isLastTab,
        isNotFound
      } = getFocusableContext(event.target);
      if (isLastTab || isNotFound) {
        event.preventDefault();
        firstTabStop.focus();
      }
    },
    tabBack(event) {
      const {
        lastTabStop,
        isFirstTab,
        isNotFound
      } = getFocusableContext(event.target);
      if (isFirstTab || isNotFound) {
        event.preventDefault();
        lastTabStop.focus();
      }
    }
  };
};
const datePickerTabEventHandler = tabHandler(DATE_PICKER_FOCUSABLE);
const monthPickerTabEventHandler = tabHandler(MONTH_PICKER_FOCUSABLE);
const yearPickerTabEventHandler = tabHandler(YEAR_PICKER_FOCUSABLE);

// #endregion Focus Handling Event Handling

// #region Date Picker Event Delegation Registration / Component

const datePickerEvents = {
  [CLICK]: {
    [DATE_PICKER_BUTTON]() {
      toggleCalendar(this);
    },
    [CALENDAR_DATE]() {
      selectDate(this);
    },
    [CALENDAR_MONTH]() {
      selectMonth(this);
    },
    [CALENDAR_YEAR]() {
      selectYear(this);
    },
    [CALENDAR_PREVIOUS_MONTH]() {
      displayPreviousMonth(this);
    },
    [CALENDAR_NEXT_MONTH]() {
      displayNextMonth(this);
    },
    [CALENDAR_PREVIOUS_YEAR]() {
      displayPreviousYear(this);
    },
    [CALENDAR_NEXT_YEAR]() {
      displayNextYear(this);
    },
    [CALENDAR_PREVIOUS_YEAR_CHUNK]() {
      displayPreviousYearChunk(this);
    },
    [CALENDAR_NEXT_YEAR_CHUNK]() {
      displayNextYearChunk(this);
    },
    [CALENDAR_MONTH_SELECTION]() {
      const newCalendar = displayMonthSelection(this);
      newCalendar.querySelector(CALENDAR_MONTH_FOCUSED).focus();
    },
    [CALENDAR_YEAR_SELECTION]() {
      const newCalendar = displayYearSelection(this);
      newCalendar.querySelector(CALENDAR_YEAR_FOCUSED).focus();
    }
  },
  keyup: {
    [DATE_PICKER_CALENDAR](event) {
      const keydown = this.dataset.keydownKeyCode;
      if (`${event.keyCode}` !== keydown) {
        event.preventDefault();
      }
    }
  },
  keydown: {
    [DATE_PICKER_EXTERNAL_INPUT](event) {
      if (event.keyCode === ENTER_KEYCODE) {
        validateDateInput(this);
      }
    },
    [CALENDAR_DATE]: keymap({
      Up: handleUpFromDate,
      ArrowUp: handleUpFromDate,
      Down: handleDownFromDate,
      ArrowDown: handleDownFromDate,
      Left: handleLeftFromDate,
      ArrowLeft: handleLeftFromDate,
      Right: handleRightFromDate,
      ArrowRight: handleRightFromDate,
      Home: handleHomeFromDate,
      End: handleEndFromDate,
      PageDown: handlePageDownFromDate,
      PageUp: handlePageUpFromDate,
      "Shift+PageDown": handleShiftPageDownFromDate,
      "Shift+PageUp": handleShiftPageUpFromDate,
      Tab: datePickerTabEventHandler.tabAhead
    }),
    [CALENDAR_DATE_PICKER]: keymap({
      Tab: datePickerTabEventHandler.tabAhead,
      "Shift+Tab": datePickerTabEventHandler.tabBack
    }),
    [CALENDAR_MONTH]: keymap({
      Up: handleUpFromMonth,
      ArrowUp: handleUpFromMonth,
      Down: handleDownFromMonth,
      ArrowDown: handleDownFromMonth,
      Left: handleLeftFromMonth,
      ArrowLeft: handleLeftFromMonth,
      Right: handleRightFromMonth,
      ArrowRight: handleRightFromMonth,
      Home: handleHomeFromMonth,
      End: handleEndFromMonth,
      PageDown: handlePageDownFromMonth,
      PageUp: handlePageUpFromMonth
    }),
    [CALENDAR_MONTH_PICKER]: keymap({
      Tab: monthPickerTabEventHandler.tabAhead,
      "Shift+Tab": monthPickerTabEventHandler.tabBack
    }),
    [CALENDAR_YEAR]: keymap({
      Up: handleUpFromYear,
      ArrowUp: handleUpFromYear,
      Down: handleDownFromYear,
      ArrowDown: handleDownFromYear,
      Left: handleLeftFromYear,
      ArrowLeft: handleLeftFromYear,
      Right: handleRightFromYear,
      ArrowRight: handleRightFromYear,
      Home: handleHomeFromYear,
      End: handleEndFromYear,
      PageDown: handlePageDownFromYear,
      PageUp: handlePageUpFromYear
    }),
    [CALENDAR_YEAR_PICKER]: keymap({
      Tab: yearPickerTabEventHandler.tabAhead,
      "Shift+Tab": yearPickerTabEventHandler.tabBack
    }),
    [DATE_PICKER_CALENDAR](event) {
      this.dataset.keydownKeyCode = event.keyCode;
    },
    [DATE_PICKER](event) {
      const keyMap = keymap({
        Escape: handleEscapeFromCalendar
      });
      keyMap(event);
    }
  },
  focusout: {
    [DATE_PICKER_EXTERNAL_INPUT]() {
      validateDateInput(this);
    },
    [DATE_PICKER](event) {
      if (!this.contains(event.relatedTarget)) {
        hideCalendar(this);
      }
    }
  },
  input: {
    [DATE_PICKER_EXTERNAL_INPUT]() {
      reconcileInputValues(this);
      updateCalendarIfVisible(this);
    }
  }
};
if (!isIosDevice()) {
  datePickerEvents.mouseover = {
    [CALENDAR_DATE_CURRENT_MONTH]() {
      handleMouseoverFromDate(this);
    },
    [CALENDAR_MONTH]() {
      handleMouseoverFromMonth(this);
    },
    [CALENDAR_YEAR]() {
      handleMouseoverFromYear(this);
    }
  };
}
const datePicker = behavior(datePickerEvents, {
  init(root) {
    selectOrMatches(DATE_PICKER, root).forEach(datePickerEl => {
      enhanceDatePicker(datePickerEl);
    });
  },
  getDatePickerContext,
  disable,
  ariaDisable,
  enable,
  isDateInputInvalid,
  setCalendarValue,
  validateDateInput,
  renderCalendar,
  updateCalendarIfVisible
});

// #endregion Date Picker Event Delegation Registration / Component

module.exports = datePicker;

},{"../../uswds-core/src/js/events":4,"../../uswds-core/src/js/utils/active-element":5,"../../uswds-core/src/js/utils/behavior":6,"../../uswds-core/src/js/utils/is-ios-device":8,"../../uswds-core/src/js/utils/sanitizer":9,"../../uswds-core/src/js/utils/select":12,"../../uswds-core/src/js/utils/select-or-matches":11,"./../../../../../../uswds/uswds-config.js":23,"receptor/keymap":22}],3:[function(require,module,exports){
"use strict";

const selectOrMatches = require("../../uswds-core/src/js/utils/select-or-matches");
const FocusTrap = require("../../uswds-core/src/js/utils/focus-trap");
const ScrollBarWidth = require("../../uswds-core/src/js/utils/scrollbar-width");
const behavior = require("../../uswds-core/src/js/utils/behavior");
const {
  prefix: PREFIX
} = require('./../../../../../../uswds/uswds-config.js');
const MODAL_CLASSNAME = `${PREFIX}-modal`;
const OVERLAY_CLASSNAME = `${MODAL_CLASSNAME}-overlay`;
const WRAPPER_CLASSNAME = `${MODAL_CLASSNAME}-wrapper`;
const OPENER_ATTRIBUTE = "data-open-modal";
const CLOSER_ATTRIBUTE = "data-close-modal";
const FORCE_ACTION_ATTRIBUTE = "data-force-action";
const NON_MODAL_HIDDEN_ATTRIBUTE = `data-modal-hidden`;
const MODAL = `.${MODAL_CLASSNAME}`;
const INITIAL_FOCUS = `.${WRAPPER_CLASSNAME} *[data-focus]`;
const CLOSE_BUTTON = `${WRAPPER_CLASSNAME} *[${CLOSER_ATTRIBUTE}]`;
const OPENERS = `*[${OPENER_ATTRIBUTE}][aria-controls]`;
const CLOSERS = `${CLOSE_BUTTON}, .${OVERLAY_CLASSNAME}:not([${FORCE_ACTION_ATTRIBUTE}])`;
const NON_MODALS = `body > *:not(.${WRAPPER_CLASSNAME}):not([aria-hidden])`;
const NON_MODALS_HIDDEN = `[${NON_MODAL_HIDDEN_ATTRIBUTE}]`;
const ACTIVE_CLASS = "usa-js-modal--active";
const PREVENT_CLICK_CLASS = "usa-js-no-click";
const VISIBLE_CLASS = "is-visible";
const HIDDEN_CLASS = "is-hidden";
let modal;
let INITIAL_BODY_PADDING;
let TEMPORARY_BODY_PADDING;
const isActive = () => document.body.classList.contains(ACTIVE_CLASS);
const SCROLLBAR_WIDTH = ScrollBarWidth();

/**
 *  Closes modal when bound to a button and pressed.
 */
const onMenuClose = () => {
  modal.toggleModal.call(modal, false);
};

/**
 * Set the value for temporary body padding that will be applied when the modal is open.
 * Value is created by checking for initial body padding and adding the width of the scrollbar.
 */
const setTemporaryBodyPadding = () => {
  INITIAL_BODY_PADDING = window.getComputedStyle(document.body).getPropertyValue("padding-right");
  TEMPORARY_BODY_PADDING = `${parseInt(INITIAL_BODY_PADDING.replace(/px/, ""), 10) + parseInt(SCROLLBAR_WIDTH.replace(/px/, ""), 10)}px`;
};

/**
 *  Toggle the visibility of a modal window
 *
 * @param {KeyboardEvent} event the keydown event.
 * @returns {boolean} safeActive if mobile is open.
 */
function toggleModal(event) {
  let originalOpener;
  let clickedElement = event.target;
  const {
    body
  } = document;
  const safeActive = !isActive();
  const modalId = clickedElement ? clickedElement.getAttribute("aria-controls") : document.querySelector(".usa-modal-wrapper.is-visible");
  const targetModal = safeActive ? document.getElementById(modalId) : document.querySelector(".usa-modal-wrapper.is-visible");

  // if there is no modal we return early
  if (!targetModal) {
    return false;
  }
  const openFocusEl = targetModal.querySelector(INITIAL_FOCUS) ? targetModal.querySelector(INITIAL_FOCUS) : targetModal.querySelector(".usa-modal");
  const returnFocus = document.getElementById(targetModal.getAttribute("data-opener"));
  const menuButton = body.querySelector(OPENERS);
  const forceUserAction = targetModal.getAttribute(FORCE_ACTION_ATTRIBUTE);

  // Sets the clicked element to the close button
  // so esc key always closes modal
  if (event.type === "keydown" && targetModal !== null) {
    clickedElement = targetModal.querySelector(CLOSE_BUTTON);
  }

  // When we're not hitting the escape key…
  if (clickedElement) {
    // Make sure we click the opener
    // If it doesn't have an ID, make one
    // Store id as data attribute on modal
    if (clickedElement.hasAttribute(OPENER_ATTRIBUTE)) {
      if (this.getAttribute("id") === null) {
        originalOpener = `modal-${Math.floor(Math.random() * 900000) + 100000}`;
        this.setAttribute("id", originalOpener);
      } else {
        originalOpener = this.getAttribute("id");
      }
      targetModal.setAttribute("data-opener", originalOpener);
    }

    // This basically stops the propagation if the element
    // is inside the modal and not a close button or
    // element inside a close button
    if (clickedElement.closest(`.${MODAL_CLASSNAME}`)) {
      if (clickedElement.hasAttribute(CLOSER_ATTRIBUTE) || clickedElement.closest(`[${CLOSER_ATTRIBUTE}]`)) {
        // do nothing. move on.
      } else {
        return false;
      }
    }
  }
  body.classList.toggle(ACTIVE_CLASS, safeActive);
  targetModal.classList.toggle(VISIBLE_CLASS, safeActive);
  targetModal.classList.toggle(HIDDEN_CLASS, !safeActive);

  // If user is forced to take an action, adding
  // a class to the body that prevents clicking underneath
  // overlay
  if (forceUserAction) {
    body.classList.toggle(PREVENT_CLICK_CLASS, safeActive);
  }

  // Temporarily increase body padding to include the width of the scrollbar.
  // This accounts for the content shift when the scrollbar is removed on modal open.
  if (body.style.paddingRight === TEMPORARY_BODY_PADDING) {
    body.style.removeProperty("padding-right");
  } else {
    body.style.paddingRight = TEMPORARY_BODY_PADDING;
  }

  // Handle the focus actions
  if (safeActive && openFocusEl) {
    // The modal window is opened. Focus is set to close button.

    // Binds escape key if we're not forcing
    // the user to take an action
    if (forceUserAction) {
      modal.focusTrap = FocusTrap(targetModal);
    } else {
      modal.focusTrap = FocusTrap(targetModal, {
        Escape: onMenuClose
      });
    }

    // Handles focus setting and interactions
    modal.focusTrap.update(safeActive);
    openFocusEl.focus();

    // Hides everything that is not the modal from screen readers
    document.querySelectorAll(NON_MODALS).forEach(nonModal => {
      nonModal.setAttribute("aria-hidden", "true");
      nonModal.setAttribute(NON_MODAL_HIDDEN_ATTRIBUTE, "");
    });
  } else if (!safeActive && menuButton && returnFocus) {
    // The modal window is closed.
    // Non-modals now accesible to screen reader
    document.querySelectorAll(NON_MODALS_HIDDEN).forEach(nonModal => {
      nonModal.removeAttribute("aria-hidden");
      nonModal.removeAttribute(NON_MODAL_HIDDEN_ATTRIBUTE);
    });

    // Focus is returned to the opener
    returnFocus.focus();
    modal.focusTrap.update(safeActive);
  }
  return safeActive;
}

/**
 * Creates a placeholder with data attributes for cleanup function.
 * The cleanup function uses this placeholder to easily restore the original Modal HTML on teardown.
 *
 * @param {HTMLDivElement} baseComponent - Modal HTML from the DOM.
 * @returns {HTMLDivElement} Placeholder used for cleanup function.
 */
const createPlaceHolder = baseComponent => {
  const modalID = baseComponent.getAttribute("id");
  const originalLocationPlaceHolder = document.createElement("div");
  const modalAttributes = Array.from(baseComponent.attributes);
  setTemporaryBodyPadding();
  originalLocationPlaceHolder.setAttribute(`data-placeholder-for`, modalID);
  originalLocationPlaceHolder.style.display = "none";
  originalLocationPlaceHolder.setAttribute("aria-hidden", "true");
  modalAttributes.forEach(attribute => {
    originalLocationPlaceHolder.setAttribute(`data-original-${attribute.name}`, attribute.value);
  });
  return originalLocationPlaceHolder;
};

/**
 * Moves necessary attributes from Modal HTML to wrapper element.
 *
 * @param {HTMLDivElement} baseComponent - Modal HTML in the DOM.
 * @param {HTMLDivElement} modalContentWrapper - Modal component wrapper element.
 * @returns Modal wrapper with correct attributes.
 */
const setModalAttributes = (baseComponent, modalContentWrapper) => {
  const modalID = baseComponent.getAttribute("id");
  const ariaLabelledBy = baseComponent.getAttribute("aria-labelledby");
  const ariaDescribedBy = baseComponent.getAttribute("aria-describedby");
  const forceUserAction = baseComponent.hasAttribute(FORCE_ACTION_ATTRIBUTE);
  if (!ariaLabelledBy) throw new Error(`${modalID} is missing aria-labelledby attribute`);
  if (!ariaDescribedBy) throw new Error(`${modalID} is missing aria-desribedby attribute`);

  // Set attributes
  modalContentWrapper.setAttribute("role", "dialog");
  modalContentWrapper.setAttribute("id", modalID);
  modalContentWrapper.setAttribute("aria-labelledby", ariaLabelledBy);
  modalContentWrapper.setAttribute("aria-describedby", ariaDescribedBy);
  if (forceUserAction) {
    modalContentWrapper.setAttribute(FORCE_ACTION_ATTRIBUTE, forceUserAction);
  }

  // Add aria-controls
  const modalClosers = modalContentWrapper.querySelectorAll(CLOSERS);
  modalClosers.forEach(el => {
    el.setAttribute("aria-controls", modalID);
  });

  // Update the base element HTML
  baseComponent.removeAttribute("id");
  baseComponent.removeAttribute("aria-labelledby");
  baseComponent.removeAttribute("aria-describedby");
  baseComponent.setAttribute("tabindex", "-1");
  return modalContentWrapper;
};

/**
 * Creates a hidden modal content wrapper.
 * Rebuilds the original Modal HTML in the new wrapper and adds a page overlay.
 * Then moves original Modal HTML attributes to the new wrapper.
 *
 * @param {HTMLDivElement} baseComponent - Original Modal HTML in the DOM.
 * @returns Modal component - Modal wrapper w/ nested Overlay and Modal Content.
 */
const rebuildModal = baseComponent => {
  const modalContent = baseComponent;
  const modalContentWrapper = document.createElement("div");
  const overlayDiv = document.createElement("div");

  // Add classes
  modalContentWrapper.classList.add(HIDDEN_CLASS, WRAPPER_CLASSNAME);
  overlayDiv.classList.add(OVERLAY_CLASSNAME);

  // Rebuild the modal element
  modalContentWrapper.append(overlayDiv);
  overlayDiv.append(modalContent);

  // Add attributes
  setModalAttributes(modalContent, modalContentWrapper);
  return modalContentWrapper;
};

/**
 *  Builds modal window from base HTML and appends to the end of the DOM.
 *
 * @param {HTMLDivElement} baseComponent - The modal div element in the DOM.
 */
const setUpModal = baseComponent => {
  const modalID = baseComponent.getAttribute("id");
  if (!modalID) {
    throw new Error(`Modal markup is missing ID`);
  }

  // Create placeholder where modal is for cleanup
  const originalLocationPlaceHolder = createPlaceHolder(baseComponent);
  baseComponent.after(originalLocationPlaceHolder);

  // Build modal component
  const modalComponent = rebuildModal(baseComponent);

  // Move all modals to the end of the DOM. Doing this allows us to
  // more easily find the elements to hide from screen readers
  // when the modal is open.
  document.body.appendChild(modalComponent);
};

/**
 * Removes dynamically created Modal and Wrapper elements and restores original Modal HTML.
 *
 * @param {HTMLDivElement} baseComponent - The modal div element in the DOM.
 */
const cleanUpModal = baseComponent => {
  const modalContent = baseComponent;
  const modalContentWrapper = modalContent.parentElement.parentElement;
  const modalID = modalContentWrapper.getAttribute("id");

  // if there is no modalID, return early
  if (!modalID) {
    return;
  }
  const originalLocationPlaceHolder = document.querySelector(`[data-placeholder-for="${modalID}"]`);
  if (originalLocationPlaceHolder) {
    const modalAttributes = Array.from(originalLocationPlaceHolder.attributes);
    modalAttributes.forEach(attribute => {
      if (attribute.name.startsWith("data-original-")) {
        // data-original- is 14 long
        modalContent.setAttribute(attribute.name.substr(14), attribute.value);
      }
    });
    originalLocationPlaceHolder.after(modalContent);
    originalLocationPlaceHolder.parentElement.removeChild(originalLocationPlaceHolder);
  }
  modalContentWrapper.parentElement.removeChild(modalContentWrapper);
};
modal = behavior({}, {
  init(root) {
    selectOrMatches(MODAL, root).forEach(modalWindow => {
      const modalId = modalWindow.id;
      setUpModal(modalWindow);

      // Query all openers and closers including the overlay
      selectOrMatches(`[aria-controls="${modalId}"]`, document).forEach(modalTrigger => {
        // If modalTrigger is an anchor...
        if (modalTrigger.nodeName === "A") {
          // Turn anchor links into buttons for screen readers
          modalTrigger.setAttribute("role", "button");

          // Prevent modal triggers from acting like links
          modalTrigger.addEventListener("click", e => e.preventDefault());
        }

        // Can uncomment when aria-haspopup="dialog" is supported
        // https://a11ysupport.io/tech/aria/aria-haspopup_attribute
        // Most screen readers support aria-haspopup, but might announce
        // as opening a menu if "dialog" is not supported.
        // modalTrigger.setAttribute("aria-haspopup", "dialog");

        modalTrigger.addEventListener("click", toggleModal);
      });
    });
  },
  teardown(root) {
    selectOrMatches(MODAL, root).forEach(modalWindow => {
      const modalId = modalWindow.id;
      cleanUpModal(modalWindow);
      selectOrMatches(`[aria-controls="${modalId}"]`, document).forEach(modalTrigger => modalTrigger.removeEventListener("click", toggleModal));
    });
  },
  focusTrap: null,
  toggleModal
});
module.exports = modal;

},{"../../uswds-core/src/js/utils/behavior":6,"../../uswds-core/src/js/utils/focus-trap":7,"../../uswds-core/src/js/utils/scrollbar-width":10,"../../uswds-core/src/js/utils/select-or-matches":11,"./../../../../../../uswds/uswds-config.js":23}],4:[function(require,module,exports){
"use strict";

module.exports = {
  // This used to be conditionally dependent on whether the
  // browser supported touch events; if it did, `CLICK` was set to
  // `touchstart`.  However, this had downsides:
  //
  // * It pre-empted mobile browsers' default behavior of detecting
  //   whether a touch turned into a scroll, thereby preventing
  //   users from using some of our components as scroll surfaces.
  //
  // * Some devices, such as the Microsoft Surface Pro, support *both*
  //   touch and clicks. This meant the conditional effectively dropped
  //   support for the user's mouse, frustrating users who preferred
  //   it on those systems.
  CLICK: "click"
};

},{}],5:[function(require,module,exports){
"use strict";

module.exports = (htmlDocument = document) => htmlDocument.activeElement;

},{}],6:[function(require,module,exports){
"use strict";

const assign = require("object-assign");
const Behavior = require("receptor/behavior");

/**
 * @name sequence
 * @param {...Function} seq an array of functions
 * @return { closure } callHooks
 */
// We use a named function here because we want it to inherit its lexical scope
// from the behavior props object, not from the module
const sequence = (...seq) => function callHooks(target = document.body) {
  seq.forEach(method => {
    if (typeof this[method] === "function") {
      this[method].call(this, target);
    }
  });
};

/**
 * @name behavior
 * @param {object} events
 * @param {object?} props
 * @return {receptor.behavior}
 */
module.exports = (events, props) => Behavior(events, assign({
  on: sequence("init", "add"),
  off: sequence("teardown", "remove")
}, props));

},{"object-assign":15,"receptor/behavior":16}],7:[function(require,module,exports){
"use strict";

const assign = require("object-assign");
const {
  keymap
} = require("receptor");
const behavior = require("./behavior");
const select = require("./select");
const activeElement = require("./active-element");
const FOCUSABLE = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]';
const tabHandler = context => {
  const focusableElements = select(FOCUSABLE, context);
  const firstTabStop = focusableElements[0];
  const lastTabStop = focusableElements[focusableElements.length - 1];

  // Special rules for when the user is tabbing forward from the last focusable element,
  // or when tabbing backwards from the first focusable element
  function tabAhead(event) {
    if (activeElement() === lastTabStop) {
      event.preventDefault();
      firstTabStop.focus();
    }
  }
  function tabBack(event) {
    if (activeElement() === firstTabStop) {
      event.preventDefault();
      lastTabStop.focus();
    }
    // This checks if you want to set the initial focus to a container
    // instead of an element within, and the user tabs back.
    // Then we set the focus to the first
    else if (!focusableElements.includes(activeElement())) {
      event.preventDefault();
      firstTabStop.focus();
    }
  }
  return {
    firstTabStop,
    lastTabStop,
    tabAhead,
    tabBack
  };
};
module.exports = (context, additionalKeyBindings = {}) => {
  const tabEventHandler = tabHandler(context);
  const bindings = additionalKeyBindings;
  const {
    Esc,
    Escape
  } = bindings;
  if (Escape && !Esc) bindings.Esc = Escape;

  //  TODO: In the future, loop over additional keybindings and pass an array
  // of functions, if necessary, to the map keys. Then people implementing
  // the focus trap could pass callbacks to fire when tabbing
  const keyMappings = keymap(assign({
    Tab: tabEventHandler.tabAhead,
    "Shift+Tab": tabEventHandler.tabBack
  }, additionalKeyBindings));
  const focusTrap = behavior({
    keydown: keyMappings
  }, {
    init() {
      // TODO: is this desireable behavior? Should the trap always do this by default or should
      // the component getting decorated handle this?
      if (tabEventHandler.firstTabStop) {
        tabEventHandler.firstTabStop.focus();
      }
    },
    update(isActive) {
      if (isActive) {
        this.on();
      } else {
        this.off();
      }
    }
  });
  return focusTrap;
};

},{"./active-element":5,"./behavior":6,"./select":12,"object-assign":15,"receptor":21}],8:[function(require,module,exports){
"use strict";

// iOS detection from: http://stackoverflow.com/a/9039885/177710
function isIosDevice() {
  return typeof navigator !== "undefined" && (navigator.userAgent.match(/(iPod|iPhone|iPad)/g) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) && !window.MSStream;
}
module.exports = isIosDevice;

},{}],9:[function(require,module,exports){
"use strict";

/* eslint-disable */
/* globals define, module */

/**
 * A simple library to help you escape HTML using template strings.
 *
 * It's the counterpart to our eslint "no-unsafe-innerhtml" plugin that helps us
 * avoid unsafe coding practices.
 * A full write-up of the Hows and Whys are documented
 * for developers at
 *  https://developer.mozilla.org/en-US/Firefox_OS/Security/Security_Automation
 * with additional background information and design docs at
 *  https://wiki.mozilla.org/User:Fbraun/Gaia/SafeinnerHTMLRoadmap
 *
 */

!function (factory) {
  module.exports = factory();
}(function () {
  "use strict";

  var Sanitizer = {
    _entity: /[&<>"'/]/g,
    _entities: {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&apos;",
      "/": "&#x2F;"
    },
    getEntity: function (s) {
      return Sanitizer._entities[s];
    },
    /**
     * Escapes HTML for all values in a tagged template string.
     */
    escapeHTML: function (strings) {
      var result = "";
      for (var i = 0; i < strings.length; i++) {
        result += strings[i];
        if (i + 1 < arguments.length) {
          var value = arguments[i + 1] || "";
          result += String(value).replace(Sanitizer._entity, Sanitizer.getEntity);
        }
      }
      return result;
    },
    /**
     * Escapes HTML and returns a wrapped object to be used during DOM insertion
     */
    createSafeHTML: function (strings) {
      var _len = arguments.length;
      var values = new Array(_len > 1 ? _len - 1 : 0);
      for (var _key = 1; _key < _len; _key++) {
        values[_key - 1] = arguments[_key];
      }
      var escaped = Sanitizer.escapeHTML.apply(Sanitizer, [strings].concat(values));
      return {
        __html: escaped,
        toString: function () {
          return "[object WrappedHTMLObject]";
        },
        info: "This is a wrapped HTML object. See https://developer.mozilla.or" + "g/en-US/Firefox_OS/Security/Security_Automation for more."
      };
    },
    /**
     * Unwrap safe HTML created by createSafeHTML or a custom replacement that
     * underwent security review.
     */
    unwrapSafeHTML: function () {
      var _len = arguments.length;
      var htmlObjects = new Array(_len);
      for (var _key = 0; _key < _len; _key++) {
        htmlObjects[_key] = arguments[_key];
      }
      var markupList = htmlObjects.map(function (obj) {
        return obj.__html;
      });
      return markupList.join("");
    }
  };
  return Sanitizer;
});

},{}],10:[function(require,module,exports){
"use strict";

module.exports = function getScrollbarWidth() {
  // Creating invisible container
  const outer = document.createElement("div");
  outer.style.visibility = "hidden";
  outer.style.overflow = "scroll"; // forcing scrollbar to appear
  outer.style.msOverflowStyle = "scrollbar"; // needed for WinJS apps
  document.body.appendChild(outer);

  // Creating inner element and placing it in the container
  const inner = document.createElement("div");
  outer.appendChild(inner);

  // Calculating difference between container's full width and the child width
  const scrollbarWidth = `${outer.offsetWidth - inner.offsetWidth}px`;

  // Removing temporary elements from the DOM
  outer.parentNode.removeChild(outer);
  return scrollbarWidth;
};

},{}],11:[function(require,module,exports){
"use strict";

const select = require("./select");
/**
 * @name isElement
 * @desc returns whether or not the given argument is a DOM element.
 * @param {any} value
 * @return {boolean}
 */
const isElement = value => value && typeof value === "object" && value.nodeType === 1;

/**
 * @name selectOrMatches
 * @desc selects elements from the DOM by class selector or ID selector.
 * @param {string} selector - The selector to traverse the DOM with.
 * @param {Document|HTMLElement?} context - The context to traverse the DOM
 *   in. If not provided, it defaults to the document.
 * @return {HTMLElement[]} - An array of DOM nodes or an empty array.
 */
module.exports = (selector, context) => {
  const selection = select(selector, context);
  if (typeof selector !== "string") {
    return selection;
  }
  if (isElement(context) && context.matches(selector)) {
    selection.push(context);
  }
  return selection;
};

},{"./select":12}],12:[function(require,module,exports){
"use strict";

/**
 * @name isElement
 * @desc returns whether or not the given argument is a DOM element.
 * @param {any} value
 * @return {boolean}
 */
const isElement = value => value && typeof value === "object" && value.nodeType === 1;

/**
 * @name select
 * @desc selects elements from the DOM by class selector or ID selector.
 * @param {string} selector - The selector to traverse the DOM with.
 * @param {Document|HTMLElement?} context - The context to traverse the DOM
 *   in. If not provided, it defaults to the document.
 * @return {HTMLElement[]} - An array of DOM nodes or an empty array.
 */
module.exports = (selector, context) => {
  if (typeof selector !== "string") {
    return [];
  }
  if (!context || !isElement(context)) {
    context = window.document; // eslint-disable-line no-param-reassign
  }
  const selection = context.querySelectorAll(selector);
  return Array.prototype.slice.call(selection);
};

},{}],13:[function(require,module,exports){
"use strict";

// element-closest | CC0-1.0 | github.com/jonathantneal/closest

(function (ElementProto) {
  if (typeof ElementProto.matches !== 'function') {
    ElementProto.matches = ElementProto.msMatchesSelector || ElementProto.mozMatchesSelector || ElementProto.webkitMatchesSelector || function matches(selector) {
      var element = this;
      var elements = (element.document || element.ownerDocument).querySelectorAll(selector);
      var index = 0;
      while (elements[index] && elements[index] !== element) {
        ++index;
      }
      return Boolean(elements[index]);
    };
  }
  if (typeof ElementProto.closest !== 'function') {
    ElementProto.closest = function closest(selector) {
      var element = this;
      while (element && element.nodeType === 1) {
        if (element.matches(selector)) {
          return element;
        }
        element = element.parentNode;
      }
      return null;
    };
  }
})(window.Element.prototype);

},{}],14:[function(require,module,exports){
"use strict";

/* global define, KeyboardEvent, module */

(function () {
  var keyboardeventKeyPolyfill = {
    polyfill: polyfill,
    keys: {
      3: 'Cancel',
      6: 'Help',
      8: 'Backspace',
      9: 'Tab',
      12: 'Clear',
      13: 'Enter',
      16: 'Shift',
      17: 'Control',
      18: 'Alt',
      19: 'Pause',
      20: 'CapsLock',
      27: 'Escape',
      28: 'Convert',
      29: 'NonConvert',
      30: 'Accept',
      31: 'ModeChange',
      32: ' ',
      33: 'PageUp',
      34: 'PageDown',
      35: 'End',
      36: 'Home',
      37: 'ArrowLeft',
      38: 'ArrowUp',
      39: 'ArrowRight',
      40: 'ArrowDown',
      41: 'Select',
      42: 'Print',
      43: 'Execute',
      44: 'PrintScreen',
      45: 'Insert',
      46: 'Delete',
      48: ['0', ')'],
      49: ['1', '!'],
      50: ['2', '@'],
      51: ['3', '#'],
      52: ['4', '$'],
      53: ['5', '%'],
      54: ['6', '^'],
      55: ['7', '&'],
      56: ['8', '*'],
      57: ['9', '('],
      91: 'OS',
      93: 'ContextMenu',
      144: 'NumLock',
      145: 'ScrollLock',
      181: 'VolumeMute',
      182: 'VolumeDown',
      183: 'VolumeUp',
      186: [';', ':'],
      187: ['=', '+'],
      188: [',', '<'],
      189: ['-', '_'],
      190: ['.', '>'],
      191: ['/', '?'],
      192: ['`', '~'],
      219: ['[', '{'],
      220: ['\\', '|'],
      221: [']', '}'],
      222: ["'", '"'],
      224: 'Meta',
      225: 'AltGraph',
      246: 'Attn',
      247: 'CrSel',
      248: 'ExSel',
      249: 'EraseEof',
      250: 'Play',
      251: 'ZoomOut'
    }
  };

  // Function keys (F1-24).
  var i;
  for (i = 1; i < 25; i++) {
    keyboardeventKeyPolyfill.keys[111 + i] = 'F' + i;
  }

  // Printable ASCII characters.
  var letter = '';
  for (i = 65; i < 91; i++) {
    letter = String.fromCharCode(i);
    keyboardeventKeyPolyfill.keys[i] = [letter.toLowerCase(), letter.toUpperCase()];
  }
  function polyfill() {
    if (!('KeyboardEvent' in window) || 'key' in KeyboardEvent.prototype) {
      return false;
    }

    // Polyfill `key` on `KeyboardEvent`.
    var proto = {
      get: function (x) {
        var key = keyboardeventKeyPolyfill.keys[this.which || this.keyCode];
        if (Array.isArray(key)) {
          key = key[+this.shiftKey];
        }
        return key;
      }
    };
    Object.defineProperty(KeyboardEvent.prototype, 'key', proto);
    return proto;
  }
  if (typeof define === 'function' && define.amd) {
    define('keyboardevent-key-polyfill', keyboardeventKeyPolyfill);
  } else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
    module.exports = keyboardeventKeyPolyfill;
  } else if (window) {
    window.keyboardeventKeyPolyfill = keyboardeventKeyPolyfill;
  }
})();

},{}],15:[function(require,module,exports){
/*
object-assign
(c) Sindre Sorhus
@license MIT
*/

'use strict';

/* eslint-disable no-unused-vars */
var getOwnPropertySymbols = Object.getOwnPropertySymbols;
var hasOwnProperty = Object.prototype.hasOwnProperty;
var propIsEnumerable = Object.prototype.propertyIsEnumerable;
function toObject(val) {
  if (val === null || val === undefined) {
    throw new TypeError('Object.assign cannot be called with null or undefined');
  }
  return Object(val);
}
function shouldUseNative() {
  try {
    if (!Object.assign) {
      return false;
    }

    // Detect buggy property enumeration order in older V8 versions.

    // https://bugs.chromium.org/p/v8/issues/detail?id=4118
    var test1 = new String('abc'); // eslint-disable-line no-new-wrappers
    test1[5] = 'de';
    if (Object.getOwnPropertyNames(test1)[0] === '5') {
      return false;
    }

    // https://bugs.chromium.org/p/v8/issues/detail?id=3056
    var test2 = {};
    for (var i = 0; i < 10; i++) {
      test2['_' + String.fromCharCode(i)] = i;
    }
    var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
      return test2[n];
    });
    if (order2.join('') !== '0123456789') {
      return false;
    }

    // https://bugs.chromium.org/p/v8/issues/detail?id=3056
    var test3 = {};
    'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
      test3[letter] = letter;
    });
    if (Object.keys(Object.assign({}, test3)).join('') !== 'abcdefghijklmnopqrst') {
      return false;
    }
    return true;
  } catch (err) {
    // We don't expect any of the above to throw, but better to be safe.
    return false;
  }
}
module.exports = shouldUseNative() ? Object.assign : function (target, source) {
  var from;
  var to = toObject(target);
  var symbols;
  for (var s = 1; s < arguments.length; s++) {
    from = Object(arguments[s]);
    for (var key in from) {
      if (hasOwnProperty.call(from, key)) {
        to[key] = from[key];
      }
    }
    if (getOwnPropertySymbols) {
      symbols = getOwnPropertySymbols(from);
      for (var i = 0; i < symbols.length; i++) {
        if (propIsEnumerable.call(from, symbols[i])) {
          to[symbols[i]] = from[symbols[i]];
        }
      }
    }
  }
  return to;
};

},{}],16:[function(require,module,exports){
"use strict";

const assign = require('object-assign');
const delegate = require('../delegate');
const delegateAll = require('../delegateAll');
const DELEGATE_PATTERN = /^(.+):delegate\((.+)\)$/;
const SPACE = ' ';
const getListeners = function (type, handler) {
  var match = type.match(DELEGATE_PATTERN);
  var selector;
  if (match) {
    type = match[1];
    selector = match[2];
  }
  var options;
  if (typeof handler === 'object') {
    options = {
      capture: popKey(handler, 'capture'),
      passive: popKey(handler, 'passive')
    };
  }
  var listener = {
    selector: selector,
    delegate: typeof handler === 'object' ? delegateAll(handler) : selector ? delegate(selector, handler) : handler,
    options: options
  };
  if (type.indexOf(SPACE) > -1) {
    return type.split(SPACE).map(function (_type) {
      return assign({
        type: _type
      }, listener);
    });
  } else {
    listener.type = type;
    return [listener];
  }
};
var popKey = function (obj, key) {
  var value = obj[key];
  delete obj[key];
  return value;
};
module.exports = function behavior(events, props) {
  const listeners = Object.keys(events).reduce(function (memo, type) {
    var listeners = getListeners(type, events[type]);
    return memo.concat(listeners);
  }, []);
  return assign({
    add: function addBehavior(element) {
      listeners.forEach(function (listener) {
        element.addEventListener(listener.type, listener.delegate, listener.options);
      });
    },
    remove: function removeBehavior(element) {
      listeners.forEach(function (listener) {
        element.removeEventListener(listener.type, listener.delegate, listener.options);
      });
    }
  }, props);
};

},{"../delegate":18,"../delegateAll":19,"object-assign":15}],17:[function(require,module,exports){
"use strict";

module.exports = function compose(functions) {
  return function (e) {
    return functions.some(function (fn) {
      return fn.call(this, e) === false;
    }, this);
  };
};

},{}],18:[function(require,module,exports){
"use strict";

// polyfill Element.prototype.closest
require('element-closest');
module.exports = function delegate(selector, fn) {
  return function delegation(event) {
    var target = event.target.closest(selector);
    if (target) {
      return fn.call(target, event);
    }
  };
};

},{"element-closest":13}],19:[function(require,module,exports){
"use strict";

const delegate = require('../delegate');
const compose = require('../compose');
const SPLAT = '*';
module.exports = function delegateAll(selectors) {
  const keys = Object.keys(selectors);

  // XXX optimization: if there is only one handler and it applies to
  // all elements (the "*" CSS selector), then just return that
  // handler
  if (keys.length === 1 && keys[0] === SPLAT) {
    return selectors[SPLAT];
  }
  const delegates = keys.reduce(function (memo, selector) {
    memo.push(delegate(selector, selectors[selector]));
    return memo;
  }, []);
  return compose(delegates);
};

},{"../compose":17,"../delegate":18}],20:[function(require,module,exports){
"use strict";

module.exports = function ignore(element, fn) {
  return function ignorance(e) {
    if (element !== e.target && !element.contains(e.target)) {
      return fn.call(this, e);
    }
  };
};

},{}],21:[function(require,module,exports){
"use strict";

module.exports = {
  behavior: require('./behavior'),
  delegate: require('./delegate'),
  delegateAll: require('./delegateAll'),
  ignore: require('./ignore'),
  keymap: require('./keymap')
};

},{"./behavior":16,"./delegate":18,"./delegateAll":19,"./ignore":20,"./keymap":22}],22:[function(require,module,exports){
"use strict";

require('keyboardevent-key-polyfill');

// these are the only relevant modifiers supported on all platforms,
// according to MDN:
// <https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/getModifierState>
const MODIFIERS = {
  'Alt': 'altKey',
  'Control': 'ctrlKey',
  'Ctrl': 'ctrlKey',
  'Shift': 'shiftKey'
};
const MODIFIER_SEPARATOR = '+';
const getEventKey = function (event, hasModifiers) {
  var key = event.key;
  if (hasModifiers) {
    for (var modifier in MODIFIERS) {
      if (event[MODIFIERS[modifier]] === true) {
        key = [modifier, key].join(MODIFIER_SEPARATOR);
      }
    }
  }
  return key;
};
module.exports = function keymap(keys) {
  const hasModifiers = Object.keys(keys).some(function (key) {
    return key.indexOf(MODIFIER_SEPARATOR) > -1;
  });
  return function (event) {
    var key = getEventKey(event, hasModifiers);
    return [key, key.toLowerCase()].reduce(function (result, _key) {
      if (_key in keys) {
        result = keys[key].call(this, event);
      }
      return result;
    }, undefined);
  };
};
module.exports.MODIFIERS = MODIFIERS;

},{"keyboardevent-key-polyfill":14}],23:[function(require,module,exports){
"use strict";

module.exports = {
  prefix: "usa"
};

},{}],24:[function(require,module,exports){
"use strict";

const ComboBox = require("@uswds/uswds/packages/usa-combo-box/src/index.js");
const DatePicker = require("@uswds/uswds/packages/usa-date-picker/src/index.js");
const modal = require("@uswds/uswds/packages/usa-modal/src/index.js");

// Initialize modal event listeners
ComboBox.on();
DatePicker.on();
modal.on();

},{"@uswds/uswds/packages/usa-combo-box/src/index.js":1,"@uswds/uswds/packages/usa-date-picker/src/index.js":2,"@uswds/uswds/packages/usa-modal/src/index.js":3}]},{},[24])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvQHVzd2RzL3Vzd2RzL3BhY2thZ2VzL3VzYS1jb21iby1ib3gvc3JjL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0B1c3dkcy91c3dkcy9wYWNrYWdlcy91c2EtZGF0ZS1waWNrZXIvc3JjL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0B1c3dkcy91c3dkcy9wYWNrYWdlcy91c2EtbW9kYWwvc3JjL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0B1c3dkcy91c3dkcy9wYWNrYWdlcy91c3dkcy1jb3JlL3NyYy9qcy9ldmVudHMuanMiLCJub2RlX21vZHVsZXMvQHVzd2RzL3Vzd2RzL3BhY2thZ2VzL3Vzd2RzLWNvcmUvc3JjL2pzL3V0aWxzL2FjdGl2ZS1lbGVtZW50LmpzIiwibm9kZV9tb2R1bGVzL0B1c3dkcy91c3dkcy9wYWNrYWdlcy91c3dkcy1jb3JlL3NyYy9qcy91dGlscy9iZWhhdmlvci5qcyIsIm5vZGVfbW9kdWxlcy9AdXN3ZHMvdXN3ZHMvcGFja2FnZXMvdXN3ZHMtY29yZS9zcmMvanMvdXRpbHMvZm9jdXMtdHJhcC5qcyIsIm5vZGVfbW9kdWxlcy9AdXN3ZHMvdXN3ZHMvcGFja2FnZXMvdXN3ZHMtY29yZS9zcmMvanMvdXRpbHMvaXMtaW9zLWRldmljZS5qcyIsIm5vZGVfbW9kdWxlcy9AdXN3ZHMvdXN3ZHMvcGFja2FnZXMvdXN3ZHMtY29yZS9zcmMvanMvdXRpbHMvc2FuaXRpemVyLmpzIiwibm9kZV9tb2R1bGVzL0B1c3dkcy91c3dkcy9wYWNrYWdlcy91c3dkcy1jb3JlL3NyYy9qcy91dGlscy9zY3JvbGxiYXItd2lkdGguanMiLCJub2RlX21vZHVsZXMvQHVzd2RzL3Vzd2RzL3BhY2thZ2VzL3Vzd2RzLWNvcmUvc3JjL2pzL3V0aWxzL3NlbGVjdC1vci1tYXRjaGVzLmpzIiwibm9kZV9tb2R1bGVzL0B1c3dkcy91c3dkcy9wYWNrYWdlcy91c3dkcy1jb3JlL3NyYy9qcy91dGlscy9zZWxlY3QuanMiLCJub2RlX21vZHVsZXMvZWxlbWVudC1jbG9zZXN0L2VsZW1lbnQtY2xvc2VzdC5qcyIsIm5vZGVfbW9kdWxlcy9rZXlib2FyZGV2ZW50LWtleS1wb2x5ZmlsbC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9vYmplY3QtYXNzaWduL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3JlY2VwdG9yL2JlaGF2aW9yL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3JlY2VwdG9yL2NvbXBvc2UvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcmVjZXB0b3IvZGVsZWdhdGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcmVjZXB0b3IvZGVsZWdhdGVBbGwvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcmVjZXB0b3IvaWdub3JlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3JlY2VwdG9yL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3JlY2VwdG9yL2tleW1hcC9pbmRleC5qcyIsInVzd2RzL3Vzd2RzLWNvbmZpZy5qcyIsInVzd2RzL3dpZGdldC11c3dkcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDQUEsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDO0FBQ3pDLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxpREFBaUQsQ0FBQztBQUNsRixNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsd0NBQXdDLENBQUM7QUFDbEUsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLHlDQUF5QyxDQUFDO0FBQ3BFLE1BQU07RUFBRSxNQUFNLEVBQUU7QUFBTyxDQUFDLEdBQUcsT0FBTyxDQUFDLGdDQUFnQyxDQUFDO0FBQ3BFLE1BQU07RUFBRTtBQUFNLENBQUMsR0FBRyxPQUFPLENBQUMsZ0NBQWdDLENBQUM7QUFFM0QsTUFBTSxlQUFlLEdBQUcsR0FBRyxNQUFNLFlBQVk7QUFDN0MsTUFBTSx3QkFBd0IsR0FBRyxHQUFHLGVBQWUsWUFBWTtBQUMvRCxN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Q0FBQyxFQUFFLENBQUMsQ0FBQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsImNvbnN0IGtleW1hcCA9IHJlcXVpcmUoXCJyZWNlcHRvci9rZXltYXBcIik7XG5jb25zdCBzZWxlY3RPck1hdGNoZXMgPSByZXF1aXJlKFwiLi4vLi4vdXN3ZHMtY29yZS9zcmMvanMvdXRpbHMvc2VsZWN0LW9yLW1hdGNoZXNcIik7XG5jb25zdCBiZWhhdmlvciA9IHJlcXVpcmUoXCIuLi8uLi91c3dkcy1jb3JlL3NyYy9qcy91dGlscy9iZWhhdmlvclwiKTtcbmNvbnN0IFNhbml0aXplciA9IHJlcXVpcmUoXCIuLi8uLi91c3dkcy1jb3JlL3NyYy9qcy91dGlscy9zYW5pdGl6ZXJcIik7XG5jb25zdCB7IHByZWZpeDogUFJFRklYIH0gPSByZXF1aXJlKFwiLi4vLi4vdXN3ZHMtY29yZS9zcmMvanMvY29uZmlnXCIpO1xuY29uc3QgeyBDTElDSyB9ID0gcmVxdWlyZShcIi4uLy4uL3Vzd2RzLWNvcmUvc3JjL2pzL2V2ZW50c1wiKTtcblxuY29uc3QgQ09NQk9fQk9YX0NMQVNTID0gYCR7UFJFRklYfS1jb21iby1ib3hgO1xuY29uc3QgQ09NQk9fQk9YX1BSSVNUSU5FX0NMQVNTID0gYCR7Q09NQk9fQk9YX0NMQVNTfS0tcHJpc3RpbmVgO1xuY29uc3QgU0VMRUNUX0NMQVNTID0gYCR7Q09NQk9fQk9YX0NMQVNTfV9fc2VsZWN0YDtcbmNvbnN0IElOUFVUX0NMQVNTID0gYCR7Q09NQk9fQk9YX0NMQVNTfV9faW5wdXRgO1xuY29uc3QgQ0xFQVJfSU5QVVRfQlVUVE9OX0NMQVNTID0gYCR7Q09NQk9fQk9YX0NMQVNTfV9fY2xlYXItaW5wdXRgO1xuY29uc3QgQ0xFQVJfSU5QVVRfQlVUVE9OX1dSQVBQRVJfQ0xBU1MgPSBgJHtDTEVBUl9JTlBVVF9CVVRUT05fQ0xBU1N9X193cmFwcGVyYDtcbmNvbnN0IElOUFVUX0JVVFRPTl9TRVBBUkFUT1JfQ0xBU1MgPSBgJHtDT01CT19CT1hfQ0xBU1N9X19pbnB1dC1idXR0b24tc2VwYXJhdG9yYDtcbmNvbnN0IFRPR0dMRV9MSVNUX0JVVFRPTl9DTEFTUyA9IGAke0NPTUJPX0JPWF9DTEFTU31fX3RvZ2dsZS1saXN0YDtcbmNvbnN0IFRPR0dMRV9MSVNUX0JVVFRPTl9XUkFQUEVSX0NMQVNTID0gYCR7VE9HR0xFX0xJU1RfQlVUVE9OX0NMQVNTfV9fd3JhcHBlcmA7XG5jb25zdCBMSVNUX0NMQVNTID0gYCR7Q09NQk9fQk9YX0NMQVNTfV9fbGlzdGA7XG5jb25zdCBMSVNUX09QVElPTl9DTEFTUyA9IGAke0NPTUJPX0JPWF9DTEFTU31fX2xpc3Qtb3B0aW9uYDtcbmNvbnN0IExJU1RfT1BUSU9OX0ZPQ1VTRURfQ0xBU1MgPSBgJHtMSVNUX09QVElPTl9DTEFTU30tLWZvY3VzZWRgO1xuY29uc3QgTElTVF9PUFRJT05fU0VMRUNURURfQ0xBU1MgPSBgJHtMSVNUX09QVElPTl9DTEFTU30tLXNlbGVjdGVkYDtcbmNvbnN0IFNUQVRVU19DTEFTUyA9IGAke0NPTUJPX0JPWF9DTEFTU31fX3N0YXR1c2A7XG5cbmNvbnN0IENPTUJPX0JPWCA9IGAuJHtDT01CT19CT1hfQ0xBU1N9YDtcbmNvbnN0IFNFTEVDVCA9IGAuJHtTRUxFQ1RfQ0xBU1N9YDtcbmNvbnN0IElOUFVUID0gYC4ke0lOUFVUX0NMQVNTfWA7XG5jb25zdCBDTEVBUl9JTlBVVF9CVVRUT04gPSBgLiR7Q0xFQVJfSU5QVVRfQlVUVE9OX0NMQVNTfWA7XG5jb25zdCBUT0dHTEVfTElTVF9CVVRUT04gPSBgLiR7VE9HR0xFX0xJU1RfQlVUVE9OX0NMQVNTfWA7XG5jb25zdCBMSVNUID0gYC4ke0xJU1RfQ0xBU1N9YDtcbmNvbnN0IExJU1RfT1BUSU9OID0gYC4ke0xJU1RfT1BUSU9OX0NMQVNTfWA7XG5jb25zdCBMSVNUX09QVElPTl9GT0NVU0VEID0gYC4ke0xJU1RfT1BUSU9OX0ZPQ1VTRURfQ0xBU1N9YDtcbmNvbnN0IExJU1RfT1BUSU9OX1NFTEVDVEVEID0gYC4ke0xJU1RfT1BUSU9OX1NFTEVDVEVEX0NMQVNTfWA7XG5jb25zdCBTVEFUVVMgPSBgLiR7U1RBVFVTX0NMQVNTfWA7XG5cbmNvbnN0IERFRkFVTFRfRklMVEVSID0gXCIuKnt7cXVlcnl9fS4qXCI7XG5cbmNvbnN0IG5vb3AgPSAoKSA9PiB7fTtcblxuLyoqXG4gKiBzZXQgdGhlIHZhbHVlIG9mIHRoZSBlbGVtZW50IGFuZCBkaXNwYXRjaCBhIGNoYW5nZSBldmVudFxuICpcbiAqIEBwYXJhbSB7SFRNTElucHV0RWxlbWVudHxIVE1MU2VsZWN0RWxlbWVudH0gZWwgVGhlIGVsZW1lbnQgdG8gdXBkYXRlXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgVGhlIG5ldyB2YWx1ZSBvZiB0aGUgZWxlbWVudFxuICovXG5jb25zdCBjaGFuZ2VFbGVtZW50VmFsdWUgPSAoZWwsIHZhbHVlID0gXCJcIikgPT4ge1xuICBjb25zdCBlbGVtZW50VG9DaGFuZ2UgPSBlbDtcbiAgZWxlbWVudFRvQ2hhbmdlLnZhbHVlID0gdmFsdWU7XG5cbiAgY29uc3QgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoXCJjaGFuZ2VcIiwge1xuICAgIGJ1YmJsZXM6IHRydWUsXG4gICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICBkZXRhaWw6IHsgdmFsdWUgfSxcbiAgfSk7XG4gIGVsZW1lbnRUb0NoYW5nZS5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbn07XG5cbi8qKlxuICogVGhlIGVsZW1lbnRzIHdpdGhpbiB0aGUgY29tYm8gYm94LlxuICogQHR5cGVkZWYge09iamVjdH0gQ29tYm9Cb3hDb250ZXh0XG4gKiBAcHJvcGVydHkge0hUTUxFbGVtZW50fSBjb21ib0JveEVsXG4gKiBAcHJvcGVydHkge0hUTUxTZWxlY3RFbGVtZW50fSBzZWxlY3RFbFxuICogQHByb3BlcnR5IHtIVE1MSW5wdXRFbGVtZW50fSBpbnB1dEVsXG4gKiBAcHJvcGVydHkge0hUTUxVTGlzdEVsZW1lbnR9IGxpc3RFbFxuICogQHByb3BlcnR5IHtIVE1MRGl2RWxlbWVudH0gc3RhdHVzRWxcbiAqIEBwcm9wZXJ0eSB7SFRNTExJRWxlbWVudH0gZm9jdXNlZE9wdGlvbkVsXG4gKiBAcHJvcGVydHkge0hUTUxMSUVsZW1lbnR9IHNlbGVjdGVkT3B0aW9uRWxcbiAqIEBwcm9wZXJ0eSB7SFRNTEJ1dHRvbkVsZW1lbnR9IHRvZ2dsZUxpc3RCdG5FbFxuICogQHByb3BlcnR5IHtIVE1MQnV0dG9uRWxlbWVudH0gY2xlYXJJbnB1dEJ0bkVsXG4gKiBAcHJvcGVydHkge2Jvb2xlYW59IGlzUHJpc3RpbmVcbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gZGlzYWJsZUZpbHRlcmluZ1xuICovXG5cbi8qKlxuICogR2V0IGFuIG9iamVjdCBvZiBlbGVtZW50cyBiZWxvbmdpbmcgZGlyZWN0bHkgdG8gdGhlIGdpdmVuXG4gKiBjb21ibyBib3ggY29tcG9uZW50LlxuICpcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsIHRoZSBlbGVtZW50IHdpdGhpbiB0aGUgY29tYm8gYm94XG4gKiBAcmV0dXJucyB7Q29tYm9Cb3hDb250ZXh0fSBlbGVtZW50c1xuICovXG5jb25zdCBnZXRDb21ib0JveENvbnRleHQgPSAoZWwpID0+IHtcbiAgY29uc3QgY29tYm9Cb3hFbCA9IGVsLmNsb3Nlc3QoQ09NQk9fQk9YKTtcblxuICBpZiAoIWNvbWJvQm94RWwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEVsZW1lbnQgaXMgbWlzc2luZyBvdXRlciAke0NPTUJPX0JPWH1gKTtcbiAgfVxuXG4gIGNvbnN0IHNlbGVjdEVsID0gY29tYm9Cb3hFbC5xdWVyeVNlbGVjdG9yKFNFTEVDVCk7XG4gIGNvbnN0IGlucHV0RWwgPSBjb21ib0JveEVsLnF1ZXJ5U2VsZWN0b3IoSU5QVVQpO1xuICBjb25zdCBsaXN0RWwgPSBjb21ib0JveEVsLnF1ZXJ5U2VsZWN0b3IoTElTVCk7XG4gIGNvbnN0IHN0YXR1c0VsID0gY29tYm9Cb3hFbC5xdWVyeVNlbGVjdG9yKFNUQVRVUyk7XG4gIGNvbnN0IGZvY3VzZWRPcHRpb25FbCA9IGNvbWJvQm94RWwucXVlcnlTZWxlY3RvcihMSVNUX09QVElPTl9GT0NVU0VEKTtcbiAgY29uc3Qgc2VsZWN0ZWRPcHRpb25FbCA9IGNvbWJvQm94RWwucXVlcnlTZWxlY3RvcihMSVNUX09QVElPTl9TRUxFQ1RFRCk7XG4gIGNvbnN0IHRvZ2dsZUxpc3RCdG5FbCA9IGNvbWJvQm94RWwucXVlcnlTZWxlY3RvcihUT0dHTEVfTElTVF9CVVRUT04pO1xuICBjb25zdCBjbGVhcklucHV0QnRuRWwgPSBjb21ib0JveEVsLnF1ZXJ5U2VsZWN0b3IoQ0xFQVJfSU5QVVRfQlVUVE9OKTtcblxuICBjb25zdCBpc1ByaXN0aW5lID0gY29tYm9Cb3hFbC5jbGFzc0xpc3QuY29udGFpbnMoQ09NQk9fQk9YX1BSSVNUSU5FX0NMQVNTKTtcbiAgY29uc3QgZGlzYWJsZUZpbHRlcmluZyA9IGNvbWJvQm94RWwuZGF0YXNldC5kaXNhYmxlRmlsdGVyaW5nID09PSBcInRydWVcIjtcblxuICByZXR1cm4ge1xuICAgIGNvbWJvQm94RWwsXG4gICAgc2VsZWN0RWwsXG4gICAgaW5wdXRFbCxcbiAgICBsaXN0RWwsXG4gICAgc3RhdHVzRWwsXG4gICAgZm9jdXNlZE9wdGlvbkVsLFxuICAgIHNlbGVjdGVkT3B0aW9uRWwsXG4gICAgdG9nZ2xlTGlzdEJ0bkVsLFxuICAgIGNsZWFySW5wdXRCdG5FbCxcbiAgICBpc1ByaXN0aW5lLFxuICAgIGRpc2FibGVGaWx0ZXJpbmcsXG4gIH07XG59O1xuXG4vKipcbiAqIERpc2FibGUgdGhlIGNvbWJvLWJveCBjb21wb25lbnRcbiAqXG4gKiBAcGFyYW0ge0hUTUxJbnB1dEVsZW1lbnR9IGVsIEFuIGVsZW1lbnQgd2l0aGluIHRoZSBjb21ibyBib3ggY29tcG9uZW50XG4gKi9cbmNvbnN0IGRpc2FibGUgPSAoZWwpID0+IHtcbiAgY29uc3QgeyBpbnB1dEVsLCB0b2dnbGVMaXN0QnRuRWwsIGNsZWFySW5wdXRCdG5FbCB9ID0gZ2V0Q29tYm9Cb3hDb250ZXh0KGVsKTtcblxuICBjbGVhcklucHV0QnRuRWwuaGlkZGVuID0gdHJ1ZTtcbiAgY2xlYXJJbnB1dEJ0bkVsLmRpc2FibGVkID0gdHJ1ZTtcbiAgdG9nZ2xlTGlzdEJ0bkVsLmRpc2FibGVkID0gdHJ1ZTtcbiAgaW5wdXRFbC5kaXNhYmxlZCA9IHRydWU7XG59O1xuXG4vKipcbiAqIENoZWNrIGZvciBhcmlhLWRpc2FibGVkIG9uIGluaXRpYWxpemF0aW9uXG4gKlxuICogQHBhcmFtIHtIVE1MSW5wdXRFbGVtZW50fSBlbCBBbiBlbGVtZW50IHdpdGhpbiB0aGUgY29tYm8gYm94IGNvbXBvbmVudFxuICovXG5jb25zdCBhcmlhRGlzYWJsZSA9IChlbCkgPT4ge1xuICBjb25zdCB7IGlucHV0RWwsIHRvZ2dsZUxpc3RCdG5FbCwgY2xlYXJJbnB1dEJ0bkVsIH0gPSBnZXRDb21ib0JveENvbnRleHQoZWwpO1xuXG4gIGNsZWFySW5wdXRCdG5FbC5oaWRkZW4gPSB0cnVlO1xuICBjbGVhcklucHV0QnRuRWwuc2V0QXR0cmlidXRlKFwiYXJpYS1kaXNhYmxlZFwiLCB0cnVlKTtcbiAgdG9nZ2xlTGlzdEJ0bkVsLnNldEF0dHJpYnV0ZShcImFyaWEtZGlzYWJsZWRcIiwgdHJ1ZSk7XG4gIGlucHV0RWwuc2V0QXR0cmlidXRlKFwiYXJpYS1kaXNhYmxlZFwiLCB0cnVlKTtcbn07XG5cbi8qKlxuICogRW5hYmxlIHRoZSBjb21iby1ib3ggY29tcG9uZW50XG4gKlxuICogQHBhcmFtIHtIVE1MSW5wdXRFbGVtZW50fSBlbCBBbiBlbGVtZW50IHdpdGhpbiB0aGUgY29tYm8gYm94IGNvbXBvbmVudFxuICovXG5jb25zdCBlbmFibGUgPSAoZWwpID0+IHtcbiAgY29uc3QgeyBpbnB1dEVsLCB0b2dnbGVMaXN0QnRuRWwsIGNsZWFySW5wdXRCdG5FbCB9ID0gZ2V0Q29tYm9Cb3hDb250ZXh0KGVsKTtcblxuICBjbGVhcklucHV0QnRuRWwuaGlkZGVuID0gZmFsc2U7XG4gIGNsZWFySW5wdXRCdG5FbC5kaXNhYmxlZCA9IGZhbHNlO1xuICB0b2dnbGVMaXN0QnRuRWwuZGlzYWJsZWQgPSBmYWxzZTtcbiAgaW5wdXRFbC5kaXNhYmxlZCA9IGZhbHNlO1xufTtcblxuLyoqXG4gKiBFbmhhbmNlIGEgc2VsZWN0IGVsZW1lbnQgaW50byBhIGNvbWJvIGJveCBjb21wb25lbnQuXG4gKlxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gX2NvbWJvQm94RWwgVGhlIGluaXRpYWwgZWxlbWVudCBvZiB0aGUgY29tYm8gYm94IGNvbXBvbmVudFxuICovXG5jb25zdCBlbmhhbmNlQ29tYm9Cb3ggPSAoX2NvbWJvQm94RWwpID0+IHtcbiAgY29uc3QgY29tYm9Cb3hFbCA9IF9jb21ib0JveEVsLmNsb3Nlc3QoQ09NQk9fQk9YKTtcblxuICBpZiAoY29tYm9Cb3hFbC5kYXRhc2V0LmVuaGFuY2VkKSByZXR1cm47XG5cbiAgY29uc3Qgc2VsZWN0RWwgPSBjb21ib0JveEVsLnF1ZXJ5U2VsZWN0b3IoXCJzZWxlY3RcIik7XG5cbiAgaWYgKCFzZWxlY3RFbCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgJHtDT01CT19CT1h9IGlzIG1pc3NpbmcgaW5uZXIgc2VsZWN0YCk7XG4gIH1cblxuICBjb25zdCBzZWxlY3RJZCA9IHNlbGVjdEVsLmlkO1xuICBjb25zdCBzZWxlY3RMYWJlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYGxhYmVsW2Zvcj1cIiR7c2VsZWN0SWR9XCJdYCk7XG4gIGNvbnN0IGxpc3RJZCA9IGAke3NlbGVjdElkfS0tbGlzdGA7XG4gIGNvbnN0IGxpc3RJZExhYmVsID0gYCR7c2VsZWN0SWR9LWxhYmVsYDtcbiAgY29uc3QgYXNzaXN0aXZlSGludElEID0gYCR7c2VsZWN0SWR9LS1hc3Npc3RpdmVIaW50YDtcbiAgY29uc3QgYWRkaXRpb25hbEF0dHJpYnV0ZXMgPSBbXTtcbiAgY29uc3QgeyBkZWZhdWx0VmFsdWUgfSA9IGNvbWJvQm94RWwuZGF0YXNldDtcbiAgY29uc3QgeyBwbGFjZWhvbGRlciB9ID0gY29tYm9Cb3hFbC5kYXRhc2V0O1xuICBsZXQgc2VsZWN0ZWRPcHRpb247XG5cbiAgaWYgKHBsYWNlaG9sZGVyKSB7XG4gICAgYWRkaXRpb25hbEF0dHJpYnV0ZXMucHVzaCh7IHBsYWNlaG9sZGVyIH0pO1xuICB9XG5cbiAgaWYgKGRlZmF1bHRWYWx1ZSkge1xuICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSBzZWxlY3RFbC5vcHRpb25zLmxlbmd0aDsgaSA8IGxlbjsgaSArPSAxKSB7XG4gICAgICBjb25zdCBvcHRpb25FbCA9IHNlbGVjdEVsLm9wdGlvbnNbaV07XG5cbiAgICAgIGlmIChvcHRpb25FbC52YWx1ZSA9PT0gZGVmYXVsdFZhbHVlKSB7XG4gICAgICAgIHNlbGVjdGVkT3B0aW9uID0gb3B0aW9uRWw7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUaHJvdyBlcnJvciBpZiBjb21ib2JveCBpcyBtaXNzaW5nIGEgbGFiZWwgb3IgbGFiZWwgaXMgbWlzc2luZ1xuICAgKiBgZm9yYCBhdHRyaWJ1dGUuIE90aGVyd2lzZSwgc2V0IHRoZSBJRCB0byBtYXRjaCB0aGUgPHVsPiBhcmlhLWxhYmVsbGVkYnlcbiAgICovXG4gIGlmICghc2VsZWN0TGFiZWwgfHwgIXNlbGVjdExhYmVsLm1hdGNoZXMoYGxhYmVsW2Zvcj1cIiR7c2VsZWN0SWR9XCJdYCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgJHtDT01CT19CT1h9IGZvciAke3NlbGVjdElkfSBpcyBlaXRoZXIgbWlzc2luZyBhIGxhYmVsIG9yIGEgXCJmb3JcIiBhdHRyaWJ1dGVgXG4gICAgKTtcbiAgfSBlbHNlIHtcbiAgICBzZWxlY3RMYWJlbC5zZXRBdHRyaWJ1dGUoXCJpZFwiLCBsaXN0SWRMYWJlbCk7XG4gIH1cblxuICBzZWxlY3RMYWJlbC5zZXRBdHRyaWJ1dGUoXCJpZFwiLCBsaXN0SWRMYWJlbCk7XG4gIHNlbGVjdEVsLnNldEF0dHJpYnV0ZShcImFyaWEtaGlkZGVuXCIsIFwidHJ1ZVwiKTtcbiAgc2VsZWN0RWwuc2V0QXR0cmlidXRlKFwidGFiaW5kZXhcIiwgXCItMVwiKTtcbiAgc2VsZWN0RWwuY2xhc3NMaXN0LmFkZChcInVzYS1zci1vbmx5XCIsIFNFTEVDVF9DTEFTUyk7XG4gIHNlbGVjdEVsLmlkID0gXCJcIjtcbiAgc2VsZWN0RWwudmFsdWUgPSBcIlwiO1xuXG4gIFtcInJlcXVpcmVkXCIsIFwiYXJpYS1sYWJlbFwiLCBcImFyaWEtbGFiZWxsZWRieVwiXS5mb3JFYWNoKChuYW1lKSA9PiB7XG4gICAgaWYgKHNlbGVjdEVsLmhhc0F0dHJpYnV0ZShuYW1lKSkge1xuICAgICAgY29uc3QgdmFsdWUgPSBzZWxlY3RFbC5nZXRBdHRyaWJ1dGUobmFtZSk7XG4gICAgICBhZGRpdGlvbmFsQXR0cmlidXRlcy5wdXNoKHsgW25hbWVdOiB2YWx1ZSB9KTtcbiAgICAgIHNlbGVjdEVsLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIHNhbml0aXplIGRvZXNuJ3QgbGlrZSBmdW5jdGlvbnMgaW4gdGVtcGxhdGUgbGl0ZXJhbHNcbiAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIik7XG4gIGlucHV0LnNldEF0dHJpYnV0ZShcImlkXCIsIHNlbGVjdElkKTtcbiAgaW5wdXQuc2V0QXR0cmlidXRlKFwiYXJpYS1vd25zXCIsIGxpc3RJZCk7XG4gIGlucHV0LnNldEF0dHJpYnV0ZShcImFyaWEtY29udHJvbHNcIiwgbGlzdElkKTtcbiAgaW5wdXQuc2V0QXR0cmlidXRlKFwiYXJpYS1hdXRvY29tcGxldGVcIiwgXCJsaXN0XCIpO1xuICBpbnB1dC5zZXRBdHRyaWJ1dGUoXCJhcmlhLWRlc2NyaWJlZGJ5XCIsIGFzc2lzdGl2ZUhpbnRJRCk7XG4gIGlucHV0LnNldEF0dHJpYnV0ZShcImFyaWEtZXhwYW5kZWRcIiwgXCJmYWxzZVwiKTtcbiAgaW5wdXQuc2V0QXR0cmlidXRlKFwiYXV0b2NhcGl0YWxpemVcIiwgXCJvZmZcIik7XG4gIGlucHV0LnNldEF0dHJpYnV0ZShcImF1dG9jb21wbGV0ZVwiLCBcIm9mZlwiKTtcbiAgaW5wdXQuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgSU5QVVRfQ0xBU1MpO1xuICBpbnB1dC5zZXRBdHRyaWJ1dGUoXCJ0eXBlXCIsIFwidGV4dFwiKTtcbiAgaW5wdXQuc2V0QXR0cmlidXRlKFwicm9sZVwiLCBcImNvbWJvYm94XCIpO1xuICBhZGRpdGlvbmFsQXR0cmlidXRlcy5mb3JFYWNoKChhdHRyKSA9PlxuICAgIE9iamVjdC5rZXlzKGF0dHIpLmZvckVhY2goKGtleSkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSBTYW5pdGl6ZXIuZXNjYXBlSFRNTGAke2F0dHJba2V5XX1gO1xuICAgICAgaW5wdXQuc2V0QXR0cmlidXRlKGtleSwgdmFsdWUpO1xuICAgIH0pXG4gICk7XG5cbiAgY29tYm9Cb3hFbC5pbnNlcnRBZGphY2VudEVsZW1lbnQoXCJiZWZvcmVlbmRcIiwgaW5wdXQpO1xuXG4gIGNvbWJvQm94RWwuaW5zZXJ0QWRqYWNlbnRIVE1MKFxuICAgIFwiYmVmb3JlZW5kXCIsXG4gICAgU2FuaXRpemVyLmVzY2FwZUhUTUxgXG4gICAgPHNwYW4gY2xhc3M9XCIke0NMRUFSX0lOUFVUX0JVVFRPTl9XUkFQUEVSX0NMQVNTfVwiIHRhYmluZGV4PVwiLTFcIj5cbiAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCIke0NMRUFSX0lOUFVUX0JVVFRPTl9DTEFTU31cIiBhcmlhLWxhYmVsPVwiQ2xlYXIgdGhlIHNlbGVjdCBjb250ZW50c1wiPiZuYnNwOzwvYnV0dG9uPlxuICAgICAgPC9zcGFuPlxuICAgICAgPHNwYW4gY2xhc3M9XCIke0lOUFVUX0JVVFRPTl9TRVBBUkFUT1JfQ0xBU1N9XCI+Jm5ic3A7PC9zcGFuPlxuICAgICAgPHNwYW4gY2xhc3M9XCIke1RPR0dMRV9MSVNUX0JVVFRPTl9XUkFQUEVSX0NMQVNTfVwiIHRhYmluZGV4PVwiLTFcIj5cbiAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgdGFiaW5kZXg9XCItMVwiIGNsYXNzPVwiJHtUT0dHTEVfTElTVF9CVVRUT05fQ0xBU1N9XCIgYXJpYS1sYWJlbD1cIlRvZ2dsZSB0aGUgZHJvcGRvd24gbGlzdFwiPiZuYnNwOzwvYnV0dG9uPlxuICAgICAgPC9zcGFuPlxuICAgICAgPHVsXG4gICAgICAgIHRhYmluZGV4PVwiLTFcIlxuICAgICAgICBpZD1cIiR7bGlzdElkfVwiXG4gICAgICAgIGNsYXNzPVwiJHtMSVNUX0NMQVNTfVwiXG4gICAgICAgIHJvbGU9XCJsaXN0Ym94XCJcbiAgICAgICAgYXJpYS1sYWJlbGxlZGJ5PVwiJHtsaXN0SWRMYWJlbH1cIlxuICAgICAgICBoaWRkZW4+XG4gICAgICA8L3VsPlxuICAgICAgPGRpdiBjbGFzcz1cIiR7U1RBVFVTX0NMQVNTfSB1c2Etc3Itb25seVwiIHJvbGU9XCJzdGF0dXNcIj48L2Rpdj5cbiAgICAgIDxzcGFuIGlkPVwiJHthc3Npc3RpdmVIaW50SUR9XCIgY2xhc3M9XCJ1c2Etc3Itb25seVwiPlxuICAgICAgICBXaGVuIGF1dG9jb21wbGV0ZSByZXN1bHRzIGFyZSBhdmFpbGFibGUgdXNlIHVwIGFuZCBkb3duIGFycm93cyB0byByZXZpZXcgYW5kIGVudGVyIHRvIHNlbGVjdC5cbiAgICAgICAgVG91Y2ggZGV2aWNlIHVzZXJzLCBleHBsb3JlIGJ5IHRvdWNoIG9yIHdpdGggc3dpcGUgZ2VzdHVyZXMuXG4gICAgICA8L3NwYW4+YFxuICApO1xuXG4gIGlmIChzZWxlY3RlZE9wdGlvbikge1xuICAgIGNvbnN0IHsgaW5wdXRFbCB9ID0gZ2V0Q29tYm9Cb3hDb250ZXh0KGNvbWJvQm94RWwpO1xuICAgIGNoYW5nZUVsZW1lbnRWYWx1ZShzZWxlY3RFbCwgc2VsZWN0ZWRPcHRpb24udmFsdWUpO1xuICAgIGNoYW5nZUVsZW1lbnRWYWx1ZShpbnB1dEVsLCBzZWxlY3RlZE9wdGlvbi50ZXh0KTtcbiAgICBjb21ib0JveEVsLmNsYXNzTGlzdC5hZGQoQ09NQk9fQk9YX1BSSVNUSU5FX0NMQVNTKTtcbiAgfVxuXG4gIGlmIChzZWxlY3RFbC5kaXNhYmxlZCkge1xuICAgIGRpc2FibGUoY29tYm9Cb3hFbCk7XG4gICAgc2VsZWN0RWwuZGlzYWJsZWQgPSBmYWxzZTtcbiAgfVxuXG4gIGlmIChzZWxlY3RFbC5oYXNBdHRyaWJ1dGUoXCJhcmlhLWRpc2FibGVkXCIpKSB7XG4gICAgYXJpYURpc2FibGUoY29tYm9Cb3hFbCk7XG4gICAgc2VsZWN0RWwucmVtb3ZlQXR0cmlidXRlKFwiYXJpYS1kaXNhYmxlZFwiKTtcbiAgfVxuXG4gIGNvbWJvQm94RWwuZGF0YXNldC5lbmhhbmNlZCA9IFwidHJ1ZVwiO1xufTtcblxuLyoqXG4gKiBNYW5hZ2UgdGhlIGZvY3VzZWQgZWxlbWVudCB3aXRoaW4gdGhlIGxpc3Qgb3B0aW9ucyB3aGVuXG4gKiBuYXZpZ2F0aW5nIHZpYSBrZXlib2FyZC5cbiAqXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbCBBbiBhbmNob3IgZWxlbWVudCB3aXRoaW4gdGhlIGNvbWJvIGJveCBjb21wb25lbnRcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IG5leHRFbCBBbiBlbGVtZW50IHdpdGhpbiB0aGUgY29tYm8gYm94IGNvbXBvbmVudFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgb3B0aW9uc1xuICogQHBhcmFtIHtib29sZWFufSBvcHRpb25zLnNraXBGb2N1cyBza2lwIGZvY3VzIG9mIGhpZ2hsaWdodGVkIGl0ZW1cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gb3B0aW9ucy5wcmV2ZW50U2Nyb2xsIHNob3VsZCBza2lwIHByb2NlZHVyZSB0byBzY3JvbGwgdG8gZWxlbWVudFxuICovXG5jb25zdCBoaWdobGlnaHRPcHRpb24gPSAoZWwsIG5leHRFbCwgeyBza2lwRm9jdXMsIHByZXZlbnRTY3JvbGwgfSA9IHt9KSA9PiB7XG4gIGNvbnN0IHsgaW5wdXRFbCwgbGlzdEVsLCBmb2N1c2VkT3B0aW9uRWwgfSA9IGdldENvbWJvQm94Q29udGV4dChlbCk7XG5cbiAgaWYgKGZvY3VzZWRPcHRpb25FbCkge1xuICAgIGZvY3VzZWRPcHRpb25FbC5jbGFzc0xpc3QucmVtb3ZlKExJU1RfT1BUSU9OX0ZPQ1VTRURfQ0xBU1MpO1xuICAgIGZvY3VzZWRPcHRpb25FbC5zZXRBdHRyaWJ1dGUoXCJ0YWJJbmRleFwiLCBcIi0xXCIpO1xuICB9XG5cbiAgaWYgKG5leHRFbCkge1xuICAgIGlucHV0RWwuc2V0QXR0cmlidXRlKFwiYXJpYS1hY3RpdmVkZXNjZW5kYW50XCIsIG5leHRFbC5pZCk7XG4gICAgbmV4dEVsLnNldEF0dHJpYnV0ZShcInRhYkluZGV4XCIsIFwiMFwiKTtcbiAgICBuZXh0RWwuY2xhc3NMaXN0LmFkZChMSVNUX09QVElPTl9GT0NVU0VEX0NMQVNTKTtcblxuICAgIGlmICghcHJldmVudFNjcm9sbCkge1xuICAgICAgY29uc3Qgb3B0aW9uQm90dG9tID0gbmV4dEVsLm9mZnNldFRvcCArIG5leHRFbC5vZmZzZXRIZWlnaHQ7XG4gICAgICBjb25zdCBjdXJyZW50Qm90dG9tID0gbGlzdEVsLnNjcm9sbFRvcCArIGxpc3RFbC5vZmZzZXRIZWlnaHQ7XG5cbiAgICAgIGlmIChvcHRpb25Cb3R0b20gPiBjdXJyZW50Qm90dG9tKSB7XG4gICAgICAgIGxpc3RFbC5zY3JvbGxUb3AgPSBvcHRpb25Cb3R0b20gLSBsaXN0RWwub2Zmc2V0SGVpZ2h0O1xuICAgICAgfVxuXG4gICAgICBpZiAobmV4dEVsLm9mZnNldFRvcCA8IGxpc3RFbC5zY3JvbGxUb3ApIHtcbiAgICAgICAgbGlzdEVsLnNjcm9sbFRvcCA9IG5leHRFbC5vZmZzZXRUb3A7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFza2lwRm9jdXMpIHtcbiAgICAgIG5leHRFbC5mb2N1cyh7IHByZXZlbnRTY3JvbGwgfSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlucHV0RWwuc2V0QXR0cmlidXRlKFwiYXJpYS1hY3RpdmVkZXNjZW5kYW50XCIsIFwiXCIpO1xuICAgIGlucHV0RWwuZm9jdXMoKTtcbiAgfVxufTtcblxuLyoqXG4gKiBHZW5lcmF0ZSBhIGR5bmFtaWMgcmVndWxhciBleHByZXNzaW9uIGJhc2VkIG9mZiBvZiBhIHJlcGxhY2VhYmxlIGFuZCBwb3NzaWJseSBmaWx0ZXJlZCB2YWx1ZS5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gZWwgQW4gZWxlbWVudCB3aXRoaW4gdGhlIGNvbWJvIGJveCBjb21wb25lbnRcbiAqIEBwYXJhbSB7c3RyaW5nfSBxdWVyeSBUaGUgdmFsdWUgdG8gdXNlIGluIHRoZSByZWd1bGFyIGV4cHJlc3Npb25cbiAqIEBwYXJhbSB7b2JqZWN0fSBleHRyYXMgQW4gb2JqZWN0IG9mIHJlZ3VsYXIgZXhwcmVzc2lvbnMgdG8gcmVwbGFjZSBhbmQgZmlsdGVyIHRoZSBxdWVyeVxuICovXG5jb25zdCBnZW5lcmF0ZUR5bmFtaWNSZWdFeHAgPSAoZmlsdGVyLCBxdWVyeSA9IFwiXCIsIGV4dHJhcyA9IHt9KSA9PiB7XG4gIGNvbnN0IGVzY2FwZVJlZ0V4cCA9ICh0ZXh0KSA9PlxuICAgIHRleHQucmVwbGFjZSgvWy1bXFxde30oKSorPy4sXFxcXF4kfCNcXHNdL2csIFwiXFxcXCQmXCIpO1xuXG4gIGxldCBmaW5kID0gZmlsdGVyLnJlcGxhY2UoL3t7KC4qPyl9fS9nLCAobSwgJDEpID0+IHtcbiAgICBjb25zdCBrZXkgPSAkMS50cmltKCk7XG4gICAgY29uc3QgcXVlcnlGaWx0ZXIgPSBleHRyYXNba2V5XTtcbiAgICBpZiAoa2V5ICE9PSBcInF1ZXJ5XCIgJiYgcXVlcnlGaWx0ZXIpIHtcbiAgICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgUmVnRXhwKHF1ZXJ5RmlsdGVyLCBcImlcIik7XG4gICAgICBjb25zdCBtYXRjaGVzID0gcXVlcnkubWF0Y2gobWF0Y2hlcik7XG5cbiAgICAgIGlmIChtYXRjaGVzKSB7XG4gICAgICAgIHJldHVybiBlc2NhcGVSZWdFeHAobWF0Y2hlc1sxXSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBcIlwiO1xuICAgIH1cbiAgICByZXR1cm4gZXNjYXBlUmVnRXhwKHF1ZXJ5KTtcbiAgfSk7XG5cbiAgZmluZCA9IGBeKD86JHtmaW5kfSkkYDtcblxuICByZXR1cm4gbmV3IFJlZ0V4cChmaW5kLCBcImlcIik7XG59O1xuXG4vKipcbiAqIERpc3BsYXkgdGhlIG9wdGlvbiBsaXN0IG9mIGEgY29tYm8gYm94IGNvbXBvbmVudC5cbiAqXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbCBBbiBlbGVtZW50IHdpdGhpbiB0aGUgY29tYm8gYm94IGNvbXBvbmVudFxuICovXG5jb25zdCBkaXNwbGF5TGlzdCA9IChlbCkgPT4ge1xuICBjb25zdCB7XG4gICAgY29tYm9Cb3hFbCxcbiAgICBzZWxlY3RFbCxcbiAgICBpbnB1dEVsLFxuICAgIGxpc3RFbCxcbiAgICBzdGF0dXNFbCxcbiAgICBpc1ByaXN0aW5lLFxuICAgIGRpc2FibGVGaWx0ZXJpbmcsXG4gIH0gPSBnZXRDb21ib0JveENvbnRleHQoZWwpO1xuICBsZXQgc2VsZWN0ZWRJdGVtSWQ7XG4gIGxldCBmaXJzdEZvdW5kSWQ7XG5cbiAgY29uc3QgbGlzdE9wdGlvbkJhc2VJZCA9IGAke2xpc3RFbC5pZH0tLW9wdGlvbi1gO1xuXG4gIGNvbnN0IGlucHV0VmFsdWUgPSAoaW5wdXRFbC52YWx1ZSB8fCBcIlwiKS50b0xvd2VyQ2FzZSgpO1xuICBjb25zdCBmaWx0ZXIgPSBjb21ib0JveEVsLmRhdGFzZXQuZmlsdGVyIHx8IERFRkFVTFRfRklMVEVSO1xuICBjb25zdCByZWdleCA9IGdlbmVyYXRlRHluYW1pY1JlZ0V4cChmaWx0ZXIsIGlucHV0VmFsdWUsIGNvbWJvQm94RWwuZGF0YXNldCk7XG5cbiAgY29uc3Qgb3B0aW9ucyA9IFtdO1xuICBmb3IgKGxldCBpID0gMCwgbGVuID0gc2VsZWN0RWwub3B0aW9ucy5sZW5ndGg7IGkgPCBsZW47IGkgKz0gMSkge1xuICAgIGNvbnN0IG9wdGlvbkVsID0gc2VsZWN0RWwub3B0aW9uc1tpXTtcbiAgICBjb25zdCBvcHRpb25JZCA9IGAke2xpc3RPcHRpb25CYXNlSWR9JHtvcHRpb25zLmxlbmd0aH1gO1xuXG4gICAgaWYgKFxuICAgICAgb3B0aW9uRWwudmFsdWUgJiZcbiAgICAgIChkaXNhYmxlRmlsdGVyaW5nIHx8XG4gICAgICAgIGlzUHJpc3RpbmUgfHxcbiAgICAgICAgIWlucHV0VmFsdWUgfHxcbiAgICAgICAgcmVnZXgudGVzdChvcHRpb25FbC50ZXh0KSlcbiAgICApIHtcbiAgICAgIGlmIChzZWxlY3RFbC52YWx1ZSAmJiBvcHRpb25FbC52YWx1ZSA9PT0gc2VsZWN0RWwudmFsdWUpIHtcbiAgICAgICAgc2VsZWN0ZWRJdGVtSWQgPSBvcHRpb25JZDtcbiAgICAgIH1cblxuICAgICAgaWYgKGRpc2FibGVGaWx0ZXJpbmcgJiYgIWZpcnN0Rm91bmRJZCAmJiByZWdleC50ZXN0KG9wdGlvbkVsLnRleHQpKSB7XG4gICAgICAgIGZpcnN0Rm91bmRJZCA9IG9wdGlvbklkO1xuICAgICAgfVxuICAgICAgb3B0aW9ucy5wdXNoKG9wdGlvbkVsKTtcbiAgICB9XG4gIH1cblxuICBjb25zdCBudW1PcHRpb25zID0gb3B0aW9ucy5sZW5ndGg7XG4gIGNvbnN0IG9wdGlvbkh0bWwgPSBvcHRpb25zLm1hcCgob3B0aW9uLCBpbmRleCkgPT4ge1xuICAgIGNvbnN0IG9wdGlvbklkID0gYCR7bGlzdE9wdGlvbkJhc2VJZH0ke2luZGV4fWA7XG4gICAgY29uc3QgY2xhc3NlcyA9IFtMSVNUX09QVElPTl9DTEFTU107XG4gICAgbGV0IHRhYmluZGV4ID0gXCItMVwiO1xuICAgIGxldCBhcmlhU2VsZWN0ZWQgPSBcImZhbHNlXCI7XG5cbiAgICBpZiAob3B0aW9uSWQgPT09IHNlbGVjdGVkSXRlbUlkKSB7XG4gICAgICBjbGFzc2VzLnB1c2goTElTVF9PUFRJT05fU0VMRUNURURfQ0xBU1MsIExJU1RfT1BUSU9OX0ZPQ1VTRURfQ0xBU1MpO1xuICAgICAgdGFiaW5kZXggPSBcIjBcIjtcbiAgICAgIGFyaWFTZWxlY3RlZCA9IFwidHJ1ZVwiO1xuICAgIH1cblxuICAgIGlmICghc2VsZWN0ZWRJdGVtSWQgJiYgaW5kZXggPT09IDApIHtcbiAgICAgIGNsYXNzZXMucHVzaChMSVNUX09QVElPTl9GT0NVU0VEX0NMQVNTKTtcbiAgICAgIHRhYmluZGV4ID0gXCIwXCI7XG4gICAgfVxuXG4gICAgY29uc3QgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGlcIik7XG5cbiAgICBsaS5zZXRBdHRyaWJ1dGUoXCJhcmlhLXNldHNpemVcIiwgb3B0aW9ucy5sZW5ndGgpO1xuICAgIGxpLnNldEF0dHJpYnV0ZShcImFyaWEtcG9zaW5zZXRcIiwgaW5kZXggKyAxKTtcbiAgICBsaS5zZXRBdHRyaWJ1dGUoXCJhcmlhLXNlbGVjdGVkXCIsIGFyaWFTZWxlY3RlZCk7XG4gICAgbGkuc2V0QXR0cmlidXRlKFwiaWRcIiwgb3B0aW9uSWQpO1xuICAgIGxpLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIGNsYXNzZXMuam9pbihcIiBcIikpO1xuICAgIGxpLnNldEF0dHJpYnV0ZShcInRhYmluZGV4XCIsIHRhYmluZGV4KTtcbiAgICBsaS5zZXRBdHRyaWJ1dGUoXCJyb2xlXCIsIFwib3B0aW9uXCIpO1xuICAgIGxpLnNldEF0dHJpYnV0ZShcImRhdGEtdmFsdWVcIiwgb3B0aW9uLnZhbHVlKTtcbiAgICBsaS50ZXh0Q29udGVudCA9IG9wdGlvbi50ZXh0O1xuXG4gICAgcmV0dXJuIGxpO1xuICB9KTtcblxuICBjb25zdCBub1Jlc3VsdHMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGlcIik7XG4gIG5vUmVzdWx0cy5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCBgJHtMSVNUX09QVElPTl9DTEFTU30tLW5vLXJlc3VsdHNgKTtcbiAgbm9SZXN1bHRzLnRleHRDb250ZW50ID0gXCJObyByZXN1bHRzIGZvdW5kXCI7XG5cbiAgbGlzdEVsLmhpZGRlbiA9IGZhbHNlO1xuXG4gIGlmIChudW1PcHRpb25zKSB7XG4gICAgbGlzdEVsLmlubmVySFRNTCA9IFwiXCI7XG4gICAgb3B0aW9uSHRtbC5mb3JFYWNoKChpdGVtKSA9PlxuICAgICAgbGlzdEVsLmluc2VydEFkamFjZW50RWxlbWVudChcImJlZm9yZWVuZFwiLCBpdGVtKVxuICAgICk7XG4gIH0gZWxzZSB7XG4gICAgbGlzdEVsLmlubmVySFRNTCA9IFwiXCI7XG4gICAgbGlzdEVsLmluc2VydEFkamFjZW50RWxlbWVudChcImJlZm9yZWVuZFwiLCBub1Jlc3VsdHMpO1xuICB9XG5cbiAgaW5wdXRFbC5zZXRBdHRyaWJ1dGUoXCJhcmlhLWV4cGFuZGVkXCIsIFwidHJ1ZVwiKTtcblxuICBzdGF0dXNFbC50ZXh0Q29udGVudCA9IG51bU9wdGlvbnNcbiAgICA/IGAke251bU9wdGlvbnN9IHJlc3VsdCR7bnVtT3B0aW9ucyA+IDEgPyBcInNcIiA6IFwiXCJ9IGF2YWlsYWJsZS5gXG4gICAgOiBcIk5vIHJlc3VsdHMuXCI7XG5cbiAgbGV0IGl0ZW1Ub0ZvY3VzO1xuXG4gIGlmIChpc1ByaXN0aW5lICYmIHNlbGVjdGVkSXRlbUlkKSB7XG4gICAgaXRlbVRvRm9jdXMgPSBsaXN0RWwucXVlcnlTZWxlY3RvcihgIyR7c2VsZWN0ZWRJdGVtSWR9YCk7XG4gIH0gZWxzZSBpZiAoZGlzYWJsZUZpbHRlcmluZyAmJiBmaXJzdEZvdW5kSWQpIHtcbiAgICBpdGVtVG9Gb2N1cyA9IGxpc3RFbC5xdWVyeVNlbGVjdG9yKGAjJHtmaXJzdEZvdW5kSWR9YCk7XG4gIH1cblxuICBpZiAoaXRlbVRvRm9jdXMpIHtcbiAgICBoaWdobGlnaHRPcHRpb24obGlzdEVsLCBpdGVtVG9Gb2N1cywge1xuICAgICAgc2tpcEZvY3VzOiB0cnVlLFxuICAgIH0pO1xuICB9XG59O1xuXG4vKipcbiAqIEhpZGUgdGhlIG9wdGlvbiBsaXN0IG9mIGEgY29tYm8gYm94IGNvbXBvbmVudC5cbiAqXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbCBBbiBlbGVtZW50IHdpdGhpbiB0aGUgY29tYm8gYm94IGNvbXBvbmVudFxuICovXG5jb25zdCBoaWRlTGlzdCA9IChlbCkgPT4ge1xuICBjb25zdCB7IGlucHV0RWwsIGxpc3RFbCwgc3RhdHVzRWwsIGZvY3VzZWRPcHRpb25FbCB9ID0gZ2V0Q29tYm9Cb3hDb250ZXh0KGVsKTtcblxuICBzdGF0dXNFbC5pbm5lckhUTUwgPSBcIlwiO1xuXG4gIGlucHV0RWwuc2V0QXR0cmlidXRlKFwiYXJpYS1leHBhbmRlZFwiLCBcImZhbHNlXCIpO1xuICBpbnB1dEVsLnNldEF0dHJpYnV0ZShcImFyaWEtYWN0aXZlZGVzY2VuZGFudFwiLCBcIlwiKTtcblxuICBpZiAoZm9jdXNlZE9wdGlvbkVsKSB7XG4gICAgZm9jdXNlZE9wdGlvbkVsLmNsYXNzTGlzdC5yZW1vdmUoTElTVF9PUFRJT05fRk9DVVNFRF9DTEFTUyk7XG4gIH1cblxuICBsaXN0RWwuc2Nyb2xsVG9wID0gMDtcbiAgbGlzdEVsLmhpZGRlbiA9IHRydWU7XG59O1xuXG4vKipcbiAqIFNlbGVjdCBhbiBvcHRpb24gbGlzdCBvZiB0aGUgY29tYm8gYm94IGNvbXBvbmVudC5cbiAqXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBsaXN0T3B0aW9uRWwgVGhlIGxpc3Qgb3B0aW9uIGJlaW5nIHNlbGVjdGVkXG4gKi9cbmNvbnN0IHNlbGVjdEl0ZW0gPSAobGlzdE9wdGlvbkVsKSA9PiB7XG4gIGNvbnN0IHsgY29tYm9Cb3hFbCwgc2VsZWN0RWwsIGlucHV0RWwgfSA9IGdldENvbWJvQm94Q29udGV4dChsaXN0T3B0aW9uRWwpO1xuXG4gIGNoYW5nZUVsZW1lbnRWYWx1ZShzZWxlY3RFbCwgbGlzdE9wdGlvbkVsLmRhdGFzZXQudmFsdWUpO1xuICBjaGFuZ2VFbGVtZW50VmFsdWUoaW5wdXRFbCwgbGlzdE9wdGlvbkVsLnRleHRDb250ZW50KTtcbiAgY29tYm9Cb3hFbC5jbGFzc0xpc3QuYWRkKENPTUJPX0JPWF9QUklTVElORV9DTEFTUyk7XG4gIGhpZGVMaXN0KGNvbWJvQm94RWwpO1xuICBpbnB1dEVsLmZvY3VzKCk7XG59O1xuXG4vKipcbiAqIENsZWFyIHRoZSBpbnB1dCBvZiB0aGUgY29tYm8gYm94XG4gKlxuICogQHBhcmFtIHtIVE1MQnV0dG9uRWxlbWVudH0gY2xlYXJCdXR0b25FbCBUaGUgY2xlYXIgaW5wdXQgYnV0dG9uXG4gKi9cbmNvbnN0IGNsZWFySW5wdXQgPSAoY2xlYXJCdXR0b25FbCkgPT4ge1xuICBjb25zdCB7IGNvbWJvQm94RWwsIGxpc3RFbCwgc2VsZWN0RWwsIGlucHV0RWwgfSA9XG4gICAgZ2V0Q29tYm9Cb3hDb250ZXh0KGNsZWFyQnV0dG9uRWwpO1xuICBjb25zdCBsaXN0U2hvd24gPSAhbGlzdEVsLmhpZGRlbjtcblxuICBpZiAoc2VsZWN0RWwudmFsdWUpIGNoYW5nZUVsZW1lbnRWYWx1ZShzZWxlY3RFbCk7XG4gIGlmIChpbnB1dEVsLnZhbHVlKSBjaGFuZ2VFbGVtZW50VmFsdWUoaW5wdXRFbCk7XG4gIGNvbWJvQm94RWwuY2xhc3NMaXN0LnJlbW92ZShDT01CT19CT1hfUFJJU1RJTkVfQ0xBU1MpO1xuXG4gIGlmIChsaXN0U2hvd24pIGRpc3BsYXlMaXN0KGNvbWJvQm94RWwpO1xuICBpbnB1dEVsLmZvY3VzKCk7XG59O1xuXG4vKipcbiAqIFJlc2V0IHRoZSBzZWxlY3QgYmFzZWQgb2ZmIG9mIGN1cnJlbnRseSBzZXQgc2VsZWN0IHZhbHVlXG4gKlxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWwgQW4gZWxlbWVudCB3aXRoaW4gdGhlIGNvbWJvIGJveCBjb21wb25lbnRcbiAqL1xuY29uc3QgcmVzZXRTZWxlY3Rpb24gPSAoZWwpID0+IHtcbiAgY29uc3QgeyBjb21ib0JveEVsLCBzZWxlY3RFbCwgaW5wdXRFbCB9ID0gZ2V0Q29tYm9Cb3hDb250ZXh0KGVsKTtcblxuICBjb25zdCBzZWxlY3RWYWx1ZSA9IHNlbGVjdEVsLnZhbHVlO1xuICBjb25zdCBpbnB1dFZhbHVlID0gKGlucHV0RWwudmFsdWUgfHwgXCJcIikudG9Mb3dlckNhc2UoKTtcblxuICBpZiAoc2VsZWN0VmFsdWUpIHtcbiAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gc2VsZWN0RWwub3B0aW9ucy5sZW5ndGg7IGkgPCBsZW47IGkgKz0gMSkge1xuICAgICAgY29uc3Qgb3B0aW9uRWwgPSBzZWxlY3RFbC5vcHRpb25zW2ldO1xuICAgICAgaWYgKG9wdGlvbkVsLnZhbHVlID09PSBzZWxlY3RWYWx1ZSkge1xuICAgICAgICBpZiAoaW5wdXRWYWx1ZSAhPT0gb3B0aW9uRWwudGV4dCkge1xuICAgICAgICAgIGNoYW5nZUVsZW1lbnRWYWx1ZShpbnB1dEVsLCBvcHRpb25FbC50ZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBjb21ib0JveEVsLmNsYXNzTGlzdC5hZGQoQ09NQk9fQk9YX1BSSVNUSU5FX0NMQVNTKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmIChpbnB1dFZhbHVlKSB7XG4gICAgY2hhbmdlRWxlbWVudFZhbHVlKGlucHV0RWwpO1xuICB9XG59O1xuXG4vKipcbiAqIFNlbGVjdCBhbiBvcHRpb24gbGlzdCBvZiB0aGUgY29tYm8gYm94IGNvbXBvbmVudCBiYXNlZCBvZmYgb2ZcbiAqIGhhdmluZyBhIGN1cnJlbnQgZm9jdXNlZCBsaXN0IG9wdGlvbiBvclxuICogaGF2aW5nIHRlc3QgdGhhdCBjb21wbGV0ZWx5IG1hdGNoZXMgYSBsaXN0IG9wdGlvbi5cbiAqIE90aGVyd2lzZSBpdCBjbGVhcnMgdGhlIGlucHV0IGFuZCBzZWxlY3QuXG4gKlxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWwgQW4gZWxlbWVudCB3aXRoaW4gdGhlIGNvbWJvIGJveCBjb21wb25lbnRcbiAqL1xuY29uc3QgY29tcGxldGVTZWxlY3Rpb24gPSAoZWwpID0+IHtcbiAgY29uc3QgeyBjb21ib0JveEVsLCBzZWxlY3RFbCwgaW5wdXRFbCwgc3RhdHVzRWwgfSA9IGdldENvbWJvQm94Q29udGV4dChlbCk7XG5cbiAgc3RhdHVzRWwudGV4dENvbnRlbnQgPSBcIlwiO1xuXG4gIGNvbnN0IGlucHV0VmFsdWUgPSAoaW5wdXRFbC52YWx1ZSB8fCBcIlwiKS50b0xvd2VyQ2FzZSgpO1xuXG4gIGlmIChpbnB1dFZhbHVlKSB7XG4gICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHNlbGVjdEVsLm9wdGlvbnMubGVuZ3RoOyBpIDwgbGVuOyBpICs9IDEpIHtcbiAgICAgIGNvbnN0IG9wdGlvbkVsID0gc2VsZWN0RWwub3B0aW9uc1tpXTtcbiAgICAgIGlmIChvcHRpb25FbC50ZXh0LnRvTG93ZXJDYXNlKCkgPT09IGlucHV0VmFsdWUpIHtcbiAgICAgICAgY2hhbmdlRWxlbWVudFZhbHVlKHNlbGVjdEVsLCBvcHRpb25FbC52YWx1ZSk7XG4gICAgICAgIGNoYW5nZUVsZW1lbnRWYWx1ZShpbnB1dEVsLCBvcHRpb25FbC50ZXh0KTtcbiAgICAgICAgY29tYm9Cb3hFbC5jbGFzc0xpc3QuYWRkKENPTUJPX0JPWF9QUklTVElORV9DTEFTUyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXNldFNlbGVjdGlvbihjb21ib0JveEVsKTtcbn07XG5cbi8qKlxuICogSGFuZGxlIHRoZSBlc2NhcGUgZXZlbnQgd2l0aGluIHRoZSBjb21ibyBib3ggY29tcG9uZW50LlxuICpcbiAqIEBwYXJhbSB7S2V5Ym9hcmRFdmVudH0gZXZlbnQgQW4gZXZlbnQgd2l0aGluIHRoZSBjb21ibyBib3ggY29tcG9uZW50XG4gKi9cbmNvbnN0IGhhbmRsZUVzY2FwZSA9IChldmVudCkgPT4ge1xuICBjb25zdCB7IGNvbWJvQm94RWwsIGlucHV0RWwgfSA9IGdldENvbWJvQm94Q29udGV4dChldmVudC50YXJnZXQpO1xuXG4gIGhpZGVMaXN0KGNvbWJvQm94RWwpO1xuICByZXNldFNlbGVjdGlvbihjb21ib0JveEVsKTtcbiAgaW5wdXRFbC5mb2N1cygpO1xufTtcblxuLyoqXG4gKiBIYW5kbGUgdGhlIGRvd24gZXZlbnQgd2l0aGluIHRoZSBjb21ibyBib3ggY29tcG9uZW50LlxuICpcbiAqIEBwYXJhbSB7S2V5Ym9hcmRFdmVudH0gZXZlbnQgQW4gZXZlbnQgd2l0aGluIHRoZSBjb21ibyBib3ggY29tcG9uZW50XG4gKi9cbmNvbnN0IGhhbmRsZURvd25Gcm9tSW5wdXQgPSAoZXZlbnQpID0+IHtcbiAgY29uc3QgeyBjb21ib0JveEVsLCBsaXN0RWwgfSA9IGdldENvbWJvQm94Q29udGV4dChldmVudC50YXJnZXQpO1xuXG4gIGlmIChsaXN0RWwuaGlkZGVuKSB7XG4gICAgZGlzcGxheUxpc3QoY29tYm9Cb3hFbCk7XG4gIH1cblxuICBjb25zdCBuZXh0T3B0aW9uRWwgPVxuICAgIGxpc3RFbC5xdWVyeVNlbGVjdG9yKExJU1RfT1BUSU9OX0ZPQ1VTRUQpIHx8XG4gICAgbGlzdEVsLnF1ZXJ5U2VsZWN0b3IoTElTVF9PUFRJT04pO1xuXG4gIGlmIChuZXh0T3B0aW9uRWwpIHtcbiAgICBoaWdobGlnaHRPcHRpb24oY29tYm9Cb3hFbCwgbmV4dE9wdGlvbkVsKTtcbiAgfVxuXG4gIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG59O1xuXG4vKipcbiAqIEhhbmRsZSB0aGUgZW50ZXIgZXZlbnQgZnJvbSBhbiBpbnB1dCBlbGVtZW50IHdpdGhpbiB0aGUgY29tYm8gYm94IGNvbXBvbmVudC5cbiAqXG4gKiBAcGFyYW0ge0tleWJvYXJkRXZlbnR9IGV2ZW50IEFuIGV2ZW50IHdpdGhpbiB0aGUgY29tYm8gYm94IGNvbXBvbmVudFxuICovXG5jb25zdCBoYW5kbGVFbnRlckZyb21JbnB1dCA9IChldmVudCkgPT4ge1xuICBjb25zdCB7IGNvbWJvQm94RWwsIGxpc3RFbCB9ID0gZ2V0Q29tYm9Cb3hDb250ZXh0KGV2ZW50LnRhcmdldCk7XG4gIGNvbnN0IGxpc3RTaG93biA9ICFsaXN0RWwuaGlkZGVuO1xuXG4gIGNvbXBsZXRlU2VsZWN0aW9uKGNvbWJvQm94RWwpO1xuXG4gIGlmIChsaXN0U2hvd24pIHtcbiAgICBoaWRlTGlzdChjb21ib0JveEVsKTtcbiAgfVxuXG4gIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG59O1xuXG4vKipcbiAqIEhhbmRsZSB0aGUgZG93biBldmVudCB3aXRoaW4gdGhlIGNvbWJvIGJveCBjb21wb25lbnQuXG4gKlxuICogQHBhcmFtIHtLZXlib2FyZEV2ZW50fSBldmVudCBBbiBldmVudCB3aXRoaW4gdGhlIGNvbWJvIGJveCBjb21wb25lbnRcbiAqL1xuY29uc3QgaGFuZGxlRG93bkZyb21MaXN0T3B0aW9uID0gKGV2ZW50KSA9PiB7XG4gIGNvbnN0IGZvY3VzZWRPcHRpb25FbCA9IGV2ZW50LnRhcmdldDtcbiAgY29uc3QgbmV4dE9wdGlvbkVsID0gZm9jdXNlZE9wdGlvbkVsLm5leHRTaWJsaW5nO1xuXG4gIGlmIChuZXh0T3B0aW9uRWwpIHtcbiAgICBoaWdobGlnaHRPcHRpb24oZm9jdXNlZE9wdGlvbkVsLCBuZXh0T3B0aW9uRWwpO1xuICB9XG5cbiAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbn07XG5cbi8qKlxuICogSGFuZGxlIHRoZSBzcGFjZSBldmVudCBmcm9tIGFuIGxpc3Qgb3B0aW9uIGVsZW1lbnQgd2l0aGluIHRoZSBjb21ibyBib3ggY29tcG9uZW50LlxuICpcbiAqIEBwYXJhbSB7S2V5Ym9hcmRFdmVudH0gZXZlbnQgQW4gZXZlbnQgd2l0aGluIHRoZSBjb21ibyBib3ggY29tcG9uZW50XG4gKi9cbmNvbnN0IGhhbmRsZVNwYWNlRnJvbUxpc3RPcHRpb24gPSAoZXZlbnQpID0+IHtcbiAgc2VsZWN0SXRlbShldmVudC50YXJnZXQpO1xuICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xufTtcblxuLyoqXG4gKiBIYW5kbGUgdGhlIGVudGVyIGV2ZW50IGZyb20gbGlzdCBvcHRpb24gd2l0aGluIHRoZSBjb21ibyBib3ggY29tcG9uZW50LlxuICpcbiAqIEBwYXJhbSB7S2V5Ym9hcmRFdmVudH0gZXZlbnQgQW4gZXZlbnQgd2l0aGluIHRoZSBjb21ibyBib3ggY29tcG9uZW50XG4gKi9cbmNvbnN0IGhhbmRsZUVudGVyRnJvbUxpc3RPcHRpb24gPSAoZXZlbnQpID0+IHtcbiAgc2VsZWN0SXRlbShldmVudC50YXJnZXQpO1xuICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xufTtcblxuLyoqXG4gKiBIYW5kbGUgdGhlIHVwIGV2ZW50IGZyb20gbGlzdCBvcHRpb24gd2l0aGluIHRoZSBjb21ibyBib3ggY29tcG9uZW50LlxuICpcbiAqIEBwYXJhbSB7S2V5Ym9hcmRFdmVudH0gZXZlbnQgQW4gZXZlbnQgd2l0aGluIHRoZSBjb21ibyBib3ggY29tcG9uZW50XG4gKi9cbmNvbnN0IGhhbmRsZVVwRnJvbUxpc3RPcHRpb24gPSAoZXZlbnQpID0+IHtcbiAgY29uc3QgeyBjb21ib0JveEVsLCBsaXN0RWwsIGZvY3VzZWRPcHRpb25FbCB9ID0gZ2V0Q29tYm9Cb3hDb250ZXh0KFxuICAgIGV2ZW50LnRhcmdldFxuICApO1xuICBjb25zdCBuZXh0T3B0aW9uRWwgPSBmb2N1c2VkT3B0aW9uRWwgJiYgZm9jdXNlZE9wdGlvbkVsLnByZXZpb3VzU2libGluZztcbiAgY29uc3QgbGlzdFNob3duID0gIWxpc3RFbC5oaWRkZW47XG5cbiAgaGlnaGxpZ2h0T3B0aW9uKGNvbWJvQm94RWwsIG5leHRPcHRpb25FbCk7XG5cbiAgaWYgKGxpc3RTaG93bikge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gIH1cblxuICBpZiAoIW5leHRPcHRpb25FbCkge1xuICAgIGhpZGVMaXN0KGNvbWJvQm94RWwpO1xuICB9XG59O1xuXG4vKipcbiAqIFNlbGVjdCBsaXN0IG9wdGlvbiBvbiB0aGUgbW91c2VvdmVyIGV2ZW50LlxuICpcbiAqIEBwYXJhbSB7TW91c2VFdmVudH0gZXZlbnQgVGhlIG1vdXNlb3ZlciBldmVudFxuICogQHBhcmFtIHtIVE1MTElFbGVtZW50fSBsaXN0T3B0aW9uRWwgQW4gZWxlbWVudCB3aXRoaW4gdGhlIGNvbWJvIGJveCBjb21wb25lbnRcbiAqL1xuY29uc3QgaGFuZGxlTW91c2VvdmVyID0gKGxpc3RPcHRpb25FbCkgPT4ge1xuICBjb25zdCBpc0N1cnJlbnRseUZvY3VzZWQgPSBsaXN0T3B0aW9uRWwuY2xhc3NMaXN0LmNvbnRhaW5zKFxuICAgIExJU1RfT1BUSU9OX0ZPQ1VTRURfQ0xBU1NcbiAgKTtcblxuICBpZiAoaXNDdXJyZW50bHlGb2N1c2VkKSByZXR1cm47XG5cbiAgaGlnaGxpZ2h0T3B0aW9uKGxpc3RPcHRpb25FbCwgbGlzdE9wdGlvbkVsLCB7XG4gICAgcHJldmVudFNjcm9sbDogdHJ1ZSxcbiAgfSk7XG59O1xuXG4vKipcbiAqIFRvZ2dsZSB0aGUgbGlzdCB3aGVuIHRoZSBidXR0b24gaXMgY2xpY2tlZFxuICpcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsIEFuIGVsZW1lbnQgd2l0aGluIHRoZSBjb21ibyBib3ggY29tcG9uZW50XG4gKi9cbmNvbnN0IHRvZ2dsZUxpc3QgPSAoZWwpID0+IHtcbiAgY29uc3QgeyBjb21ib0JveEVsLCBsaXN0RWwsIGlucHV0RWwgfSA9IGdldENvbWJvQm94Q29udGV4dChlbCk7XG5cbiAgaWYgKGxpc3RFbC5oaWRkZW4pIHtcbiAgICBkaXNwbGF5TGlzdChjb21ib0JveEVsKTtcbiAgfSBlbHNlIHtcbiAgICBoaWRlTGlzdChjb21ib0JveEVsKTtcbiAgfVxuXG4gIGlucHV0RWwuZm9jdXMoKTtcbn07XG5cbi8qKlxuICogSGFuZGxlIGNsaWNrIGZyb20gaW5wdXRcbiAqXG4gKiBAcGFyYW0ge0hUTUxJbnB1dEVsZW1lbnR9IGVsIEFuIGVsZW1lbnQgd2l0aGluIHRoZSBjb21ibyBib3ggY29tcG9uZW50XG4gKi9cbmNvbnN0IGhhbmRsZUNsaWNrRnJvbUlucHV0ID0gKGVsKSA9PiB7XG4gIGNvbnN0IHsgY29tYm9Cb3hFbCwgbGlzdEVsIH0gPSBnZXRDb21ib0JveENvbnRleHQoZWwpO1xuXG4gIGlmIChsaXN0RWwuaGlkZGVuKSB7XG4gICAgZGlzcGxheUxpc3QoY29tYm9Cb3hFbCk7XG4gIH1cbn07XG5cbmNvbnN0IGNvbWJvQm94ID0gYmVoYXZpb3IoXG4gIHtcbiAgICBbQ0xJQ0tdOiB7XG4gICAgICBbSU5QVVRdKCkge1xuICAgICAgICBpZiAodGhpcy5kaXNhYmxlZCkgcmV0dXJuO1xuICAgICAgICBoYW5kbGVDbGlja0Zyb21JbnB1dCh0aGlzKTtcbiAgICAgIH0sXG4gICAgICBbVE9HR0xFX0xJU1RfQlVUVE9OXSgpIHtcbiAgICAgICAgaWYgKHRoaXMuZGlzYWJsZWQpIHJldHVybjtcbiAgICAgICAgdG9nZ2xlTGlzdCh0aGlzKTtcbiAgICAgIH0sXG4gICAgICBbTElTVF9PUFRJT05dKCkge1xuICAgICAgICBpZiAodGhpcy5kaXNhYmxlZCkgcmV0dXJuO1xuICAgICAgICBzZWxlY3RJdGVtKHRoaXMpO1xuICAgICAgfSxcbiAgICAgIFtDTEVBUl9JTlBVVF9CVVRUT05dKCkge1xuICAgICAgICBpZiAodGhpcy5kaXNhYmxlZCkgcmV0dXJuO1xuICAgICAgICBjbGVhcklucHV0KHRoaXMpO1xuICAgICAgfSxcbiAgICB9LFxuICAgIGZvY3Vzb3V0OiB7XG4gICAgICBbQ09NQk9fQk9YXShldmVudCkge1xuICAgICAgICBpZiAoIXRoaXMuY29udGFpbnMoZXZlbnQucmVsYXRlZFRhcmdldCkpIHtcbiAgICAgICAgICByZXNldFNlbGVjdGlvbih0aGlzKTtcbiAgICAgICAgICBoaWRlTGlzdCh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICB9LFxuICAgIGtleWRvd246IHtcbiAgICAgIFtDT01CT19CT1hdOiBrZXltYXAoe1xuICAgICAgICBFc2NhcGU6IGhhbmRsZUVzY2FwZSxcbiAgICAgIH0pLFxuICAgICAgW0lOUFVUXToga2V5bWFwKHtcbiAgICAgICAgRW50ZXI6IGhhbmRsZUVudGVyRnJvbUlucHV0LFxuICAgICAgICBBcnJvd0Rvd246IGhhbmRsZURvd25Gcm9tSW5wdXQsXG4gICAgICAgIERvd246IGhhbmRsZURvd25Gcm9tSW5wdXQsXG4gICAgICB9KSxcbiAgICAgIFtMSVNUX09QVElPTl06IGtleW1hcCh7XG4gICAgICAgIEFycm93VXA6IGhhbmRsZVVwRnJvbUxpc3RPcHRpb24sXG4gICAgICAgIFVwOiBoYW5kbGVVcEZyb21MaXN0T3B0aW9uLFxuICAgICAgICBBcnJvd0Rvd246IGhhbmRsZURvd25Gcm9tTGlzdE9wdGlvbixcbiAgICAgICAgRG93bjogaGFuZGxlRG93bkZyb21MaXN0T3B0aW9uLFxuICAgICAgICBFbnRlcjogaGFuZGxlRW50ZXJGcm9tTGlzdE9wdGlvbixcbiAgICAgICAgXCIgXCI6IGhhbmRsZVNwYWNlRnJvbUxpc3RPcHRpb24sXG4gICAgICAgIFwiU2hpZnQrVGFiXCI6IG5vb3AsXG4gICAgICB9KSxcbiAgICB9LFxuICAgIGlucHV0OiB7XG4gICAgICBbSU5QVVRdKCkge1xuICAgICAgICBjb25zdCBjb21ib0JveEVsID0gdGhpcy5jbG9zZXN0KENPTUJPX0JPWCk7XG4gICAgICAgIGNvbWJvQm94RWwuY2xhc3NMaXN0LnJlbW92ZShDT01CT19CT1hfUFJJU1RJTkVfQ0xBU1MpO1xuICAgICAgICBkaXNwbGF5TGlzdCh0aGlzKTtcbiAgICAgIH0sXG4gICAgfSxcbiAgICBtb3VzZW92ZXI6IHtcbiAgICAgIFtMSVNUX09QVElPTl0oKSB7XG4gICAgICAgIGhhbmRsZU1vdXNlb3Zlcih0aGlzKTtcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIGluaXQocm9vdCkge1xuICAgICAgc2VsZWN0T3JNYXRjaGVzKENPTUJPX0JPWCwgcm9vdCkuZm9yRWFjaCgoY29tYm9Cb3hFbCkgPT4ge1xuICAgICAgICBlbmhhbmNlQ29tYm9Cb3goY29tYm9Cb3hFbCk7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGdldENvbWJvQm94Q29udGV4dCxcbiAgICBlbmhhbmNlQ29tYm9Cb3gsXG4gICAgZ2VuZXJhdGVEeW5hbWljUmVnRXhwLFxuICAgIGRpc2FibGUsXG4gICAgZW5hYmxlLFxuICAgIGRpc3BsYXlMaXN0LFxuICAgIGhpZGVMaXN0LFxuICAgIENPTUJPX0JPWF9DTEFTUyxcbiAgfVxuKTtcblxubW9kdWxlLmV4cG9ydHMgPSBjb21ib0JveDtcbiIsImNvbnN0IGtleW1hcCA9IHJlcXVpcmUoXCJyZWNlcHRvci9rZXltYXBcIik7XG5jb25zdCBiZWhhdmlvciA9IHJlcXVpcmUoXCIuLi8uLi91c3dkcy1jb3JlL3NyYy9qcy91dGlscy9iZWhhdmlvclwiKTtcbmNvbnN0IHNlbGVjdCA9IHJlcXVpcmUoXCIuLi8uLi91c3dkcy1jb3JlL3NyYy9qcy91dGlscy9zZWxlY3RcIik7XG5jb25zdCBzZWxlY3RPck1hdGNoZXMgPSByZXF1aXJlKFwiLi4vLi4vdXN3ZHMtY29yZS9zcmMvanMvdXRpbHMvc2VsZWN0LW9yLW1hdGNoZXNcIik7XG5jb25zdCB7IHByZWZpeDogUFJFRklYIH0gPSByZXF1aXJlKFwiLi4vLi4vdXN3ZHMtY29yZS9zcmMvanMvY29uZmlnXCIpO1xuY29uc3QgeyBDTElDSyB9ID0gcmVxdWlyZShcIi4uLy4uL3Vzd2RzLWNvcmUvc3JjL2pzL2V2ZW50c1wiKTtcbmNvbnN0IGFjdGl2ZUVsZW1lbnQgPSByZXF1aXJlKFwiLi4vLi4vdXN3ZHMtY29yZS9zcmMvanMvdXRpbHMvYWN0aXZlLWVsZW1lbnRcIik7XG5jb25zdCBpc0lvc0RldmljZSA9IHJlcXVpcmUoXCIuLi8uLi91c3dkcy1jb3JlL3NyYy9qcy91dGlscy9pcy1pb3MtZGV2aWNlXCIpO1xuY29uc3QgU2FuaXRpemVyID0gcmVxdWlyZShcIi4uLy4uL3Vzd2RzLWNvcmUvc3JjL2pzL3V0aWxzL3Nhbml0aXplclwiKTtcblxuY29uc3QgREFURV9QSUNLRVJfQ0xBU1MgPSBgJHtQUkVGSVh9LWRhdGUtcGlja2VyYDtcbmNvbnN0IERBVEVfUElDS0VSX1dSQVBQRVJfQ0xBU1MgPSBgJHtEQVRFX1BJQ0tFUl9DTEFTU31fX3dyYXBwZXJgO1xuY29uc3QgREFURV9QSUNLRVJfSU5JVElBTElaRURfQ0xBU1MgPSBgJHtEQVRFX1BJQ0tFUl9DTEFTU30tLWluaXRpYWxpemVkYDtcbmNvbnN0IERBVEVfUElDS0VSX0FDVElWRV9DTEFTUyA9IGAke0RBVEVfUElDS0VSX0NMQVNTfS0tYWN0aXZlYDtcbmNvbnN0IERBVEVfUElDS0VSX0lOVEVSTkFMX0lOUFVUX0NMQVNTID0gYCR7REFURV9QSUNLRVJfQ0xBU1N9X19pbnRlcm5hbC1pbnB1dGA7XG5jb25zdCBEQVRFX1BJQ0tFUl9FWFRFUk5BTF9JTlBVVF9DTEFTUyA9IGAke0RBVEVfUElDS0VSX0NMQVNTfV9fZXh0ZXJuYWwtaW5wdXRgO1xuY29uc3QgREFURV9QSUNLRVJfQlVUVE9OX0NMQVNTID0gYCR7REFURV9QSUNLRVJfQ0xBU1N9X19idXR0b25gO1xuY29uc3QgREFURV9QSUNLRVJfQ0FMRU5EQVJfQ0xBU1MgPSBgJHtEQVRFX1BJQ0tFUl9DTEFTU31fX2NhbGVuZGFyYDtcbmNvbnN0IERBVEVfUElDS0VSX1NUQVRVU19DTEFTUyA9IGAke0RBVEVfUElDS0VSX0NMQVNTfV9fc3RhdHVzYDtcbmNvbnN0IENBTEVOREFSX0RBVEVfQ0xBU1MgPSBgJHtEQVRFX1BJQ0tFUl9DQUxFTkRBUl9DTEFTU31fX2RhdGVgO1xuXG5jb25zdCBDQUxFTkRBUl9EQVRFX0ZPQ1VTRURfQ0xBU1MgPSBgJHtDQUxFTkRBUl9EQVRFX0NMQVNTfS0tZm9jdXNlZGA7XG5jb25zdCBDQUxFTkRBUl9EQVRFX1NFTEVDVEVEX0NMQVNTID0gYCR7Q0FMRU5EQVJfREFURV9DTEFTU30tLXNlbGVjdGVkYDtcbmNvbnN0IENBTEVOREFSX0RBVEVfUFJFVklPVVNfTU9OVEhfQ0xBU1MgPSBgJHtDQUxFTkRBUl9EQVRFX0NMQVNTfS0tcHJldmlvdXMtbW9udGhgO1xuY29uc3QgQ0FMRU5EQVJfREFURV9DVVJSRU5UX01PTlRIX0NMQVNTID0gYCR7Q0FMRU5EQVJfREFURV9DTEFTU30tLWN1cnJlbnQtbW9udGhgO1xuY29uc3QgQ0FMRU5EQVJfREFURV9ORVhUX01PTlRIX0NMQVNTID0gYCR7Q0FMRU5EQVJfREFURV9DTEFTU30tLW5leHQtbW9udGhgO1xuY29uc3QgQ0FMRU5EQVJfREFURV9SQU5HRV9EQVRFX0NMQVNTID0gYCR7Q0FMRU5EQVJfREFURV9DTEFTU30tLXJhbmdlLWRhdGVgO1xuY29uc3QgQ0FMRU5EQVJfREFURV9UT0RBWV9DTEFTUyA9IGAke0NBTEVOREFSX0RBVEVfQ0xBU1N9LS10b2RheWA7XG5jb25zdCBDQUxFTkRBUl9EQVRFX1JBTkdFX0RBVEVfU1RBUlRfQ0xBU1MgPSBgJHtDQUxFTkRBUl9EQVRFX0NMQVNTfS0tcmFuZ2UtZGF0ZS1zdGFydGA7XG5jb25zdCBDQUxFTkRBUl9EQVRFX1JBTkdFX0RBVEVfRU5EX0NMQVNTID0gYCR7Q0FMRU5EQVJfREFURV9DTEFTU30tLXJhbmdlLWRhdGUtZW5kYDtcbmNvbnN0IENBTEVOREFSX0RBVEVfV0lUSElOX1JBTkdFX0NMQVNTID0gYCR7Q0FMRU5EQVJfREFURV9DTEFTU30tLXdpdGhpbi1yYW5nZWA7XG5jb25zdCBDQUxFTkRBUl9QUkVWSU9VU19ZRUFSX0NMQVNTID0gYCR7REFURV9QSUNLRVJfQ0FMRU5EQVJfQ0xBU1N9X19wcmV2aW91cy15ZWFyYDtcbmNvbnN0IENBTEVOREFSX1BSRVZJT1VTX01PTlRIX0NMQVNTID0gYCR7REFURV9QSUNLRVJfQ0FMRU5EQVJfQ0xBU1N9X19wcmV2aW91cy1tb250aGA7XG5jb25zdCBDQUxFTkRBUl9ORVhUX1lFQVJfQ0xBU1MgPSBgJHtEQVRFX1BJQ0tFUl9DQUxFTkRBUl9DTEFTU31fX25leHQteWVhcmA7XG5jb25zdCBDQUxFTkRBUl9ORVhUX01PTlRIX0NMQVNTID0gYCR7REFURV9QSUNLRVJfQ0FMRU5EQVJfQ0xBU1N9X19uZXh0LW1vbnRoYDtcbmNvbnN0IENBTEVOREFSX01PTlRIX1NFTEVDVElPTl9DTEFTUyA9IGAke0RBVEVfUElDS0VSX0NBTEVOREFSX0NMQVNTfV9fbW9udGgtc2VsZWN0aW9uYDtcbmNvbnN0IENBTEVOREFSX1lFQVJfU0VMRUNUSU9OX0NMQVNTID0gYCR7REFURV9QSUNLRVJfQ0FMRU5EQVJfQ0xBU1N9X195ZWFyLXNlbGVjdGlvbmA7XG5jb25zdCBDQUxFTkRBUl9NT05USF9DTEFTUyA9IGAke0RBVEVfUElDS0VSX0NBTEVOREFSX0NMQVNTfV9fbW9udGhgO1xuY29uc3QgQ0FMRU5EQVJfTU9OVEhfRk9DVVNFRF9DTEFTUyA9IGAke0NBTEVOREFSX01PTlRIX0NMQVNTfS0tZm9jdXNlZGA7XG5jb25zdCBDQUxFTkRBUl9NT05USF9TRUxFQ1RFRF9DTEFTUyA9IGAke0NBTEVOREFSX01PTlRIX0NMQVNTfS0tc2VsZWN0ZWRgO1xuY29uc3QgQ0FMRU5EQVJfWUVBUl9DTEFTUyA9IGAke0RBVEVfUElDS0VSX0NBTEVOREFSX0NMQVNTfV9feWVhcmA7XG5jb25zdCBDQUxFTkRBUl9ZRUFSX0ZPQ1VTRURfQ0xBU1MgPSBgJHtDQUxFTkRBUl9ZRUFSX0NMQVNTfS0tZm9jdXNlZGA7XG5jb25zdCBDQUxFTkRBUl9ZRUFSX1NFTEVDVEVEX0NMQVNTID0gYCR7Q0FMRU5EQVJfWUVBUl9DTEFTU30tLXNlbGVjdGVkYDtcbmNvbnN0IENBTEVOREFSX1BSRVZJT1VTX1lFQVJfQ0hVTktfQ0xBU1MgPSBgJHtEQVRFX1BJQ0tFUl9DQUxFTkRBUl9DTEFTU31fX3ByZXZpb3VzLXllYXItY2h1bmtgO1xuY29uc3QgQ0FMRU5EQVJfTkVYVF9ZRUFSX0NIVU5LX0NMQVNTID0gYCR7REFURV9QSUNLRVJfQ0FMRU5EQVJfQ0xBU1N9X19uZXh0LXllYXItY2h1bmtgO1xuY29uc3QgQ0FMRU5EQVJfREFURV9QSUNLRVJfQ0xBU1MgPSBgJHtEQVRFX1BJQ0tFUl9DQUxFTkRBUl9DTEFTU31fX2RhdGUtcGlja2VyYDtcbmNvbnN0IENBTEVOREFSX01PTlRIX1BJQ0tFUl9DTEFTUyA9IGAke0RBVEVfUElDS0VSX0NBTEVOREFSX0NMQVNTfV9fbW9udGgtcGlja2VyYDtcbmNvbnN0IENBTEVOREFSX1lFQVJfUElDS0VSX0NMQVNTID0gYCR7REFURV9QSUNLRVJfQ0FMRU5EQVJfQ0xBU1N9X195ZWFyLXBpY2tlcmA7XG5jb25zdCBDQUxFTkRBUl9UQUJMRV9DTEFTUyA9IGAke0RBVEVfUElDS0VSX0NBTEVOREFSX0NMQVNTfV9fdGFibGVgO1xuY29uc3QgQ0FMRU5EQVJfUk9XX0NMQVNTID0gYCR7REFURV9QSUNLRVJfQ0FMRU5EQVJfQ0xBU1N9X19yb3dgO1xuY29uc3QgQ0FMRU5EQVJfQ0VMTF9DTEFTUyA9IGAke0RBVEVfUElDS0VSX0NBTEVOREFSX0NMQVNTfV9fY2VsbGA7XG5jb25zdCBDQUxFTkRBUl9DRUxMX0NFTlRFUl9JVEVNU19DTEFTUyA9IGAke0NBTEVOREFSX0NFTExfQ0xBU1N9LS1jZW50ZXItaXRlbXNgO1xuY29uc3QgQ0FMRU5EQVJfTU9OVEhfTEFCRUxfQ0xBU1MgPSBgJHtEQVRFX1BJQ0tFUl9DQUxFTkRBUl9DTEFTU31fX21vbnRoLWxhYmVsYDtcbmNvbnN0IENBTEVOREFSX0RBWV9PRl9XRUVLX0NMQVNTID0gYCR7REFURV9QSUNLRVJfQ0FMRU5EQVJfQ0xBU1N9X19kYXktb2Ytd2Vla2A7XG5cbmNvbnN0IERBVEVfUElDS0VSID0gYC4ke0RBVEVfUElDS0VSX0NMQVNTfWA7XG5jb25zdCBEQVRFX1BJQ0tFUl9CVVRUT04gPSBgLiR7REFURV9QSUNLRVJfQlVUVE9OX0NMQVNTfWA7XG5jb25zdCBEQVRFX1BJQ0tFUl9JTlRFUk5BTF9JTlBVVCA9IGAuJHtEQVRFX1BJQ0tFUl9JTlRFUk5BTF9JTlBVVF9DTEFTU31gO1xuY29uc3QgREFURV9QSUNLRVJfRVhURVJOQUxfSU5QVVQgPSBgLiR7REFURV9QSUNLRVJfRVhURVJOQUxfSU5QVVRfQ0xBU1N9YDtcbmNvbnN0IERBVEVfUElDS0VSX0NBTEVOREFSID0gYC4ke0RBVEVfUElDS0VSX0NBTEVOREFSX0NMQVNTfWA7XG5jb25zdCBEQVRFX1BJQ0tFUl9TVEFUVVMgPSBgLiR7REFURV9QSUNLRVJfU1RBVFVTX0NMQVNTfWA7XG5jb25zdCBDQUxFTkRBUl9EQVRFID0gYC4ke0NBTEVOREFSX0RBVEVfQ0xBU1N9YDtcbmNvbnN0IENBTEVOREFSX0RBVEVfRk9DVVNFRCA9IGAuJHtDQUxFTkRBUl9EQVRFX0ZPQ1VTRURfQ0xBU1N9YDtcbmNvbnN0IENBTEVOREFSX0RBVEVfQ1VSUkVOVF9NT05USCA9IGAuJHtDQUxFTkRBUl9EQVRFX0NVUlJFTlRfTU9OVEhfQ0xBU1N9YDtcbmNvbnN0IENBTEVOREFSX1BSRVZJT1VTX1lFQVIgPSBgLiR7Q0FMRU5EQVJfUFJFVklPVVNfWUVBUl9DTEFTU31gO1xuY29uc3QgQ0FMRU5EQVJfUFJFVklPVVNfTU9OVEggPSBgLiR7Q0FMRU5EQVJfUFJFVklPVVNfTU9OVEhfQ0xBU1N9YDtcbmNvbnN0IENBTEVOREFSX05FWFRfWUVBUiA9IGAuJHtDQUxFTkRBUl9ORVhUX1lFQVJfQ0xBU1N9YDtcbmNvbnN0IENBTEVOREFSX05FWFRfTU9OVEggPSBgLiR7Q0FMRU5EQVJfTkVYVF9NT05USF9DTEFTU31gO1xuY29uc3QgQ0FMRU5EQVJfWUVBUl9TRUxFQ1RJT04gPSBgLiR7Q0FMRU5EQVJfWUVBUl9TRUxFQ1RJT05fQ0xBU1N9YDtcbmNvbnN0IENBTEVOREFSX01PTlRIX1NFTEVDVElPTiA9IGAuJHtDQUxFTkRBUl9NT05USF9TRUxFQ1RJT05fQ0xBU1N9YDtcbmNvbnN0IENBTEVOREFSX01PTlRIID0gYC4ke0NBTEVOREFSX01PTlRIX0NMQVNTfWA7XG5jb25zdCBDQUxFTkRBUl9ZRUFSID0gYC4ke0NBTEVOREFSX1lFQVJfQ0xBU1N9YDtcbmNvbnN0IENBTEVOREFSX1BSRVZJT1VTX1lFQVJfQ0hVTksgPSBgLiR7Q0FMRU5EQVJfUFJFVklPVVNfWUVBUl9DSFVOS19DTEFTU31gO1xuY29uc3QgQ0FMRU5EQVJfTkVYVF9ZRUFSX0NIVU5LID0gYC4ke0NBTEVOREFSX05FWFRfWUVBUl9DSFVOS19DTEFTU31gO1xuY29uc3QgQ0FMRU5EQVJfREFURV9QSUNLRVIgPSBgLiR7Q0FMRU5EQVJfREFURV9QSUNLRVJfQ0xBU1N9YDtcbmNvbnN0IENBTEVOREFSX01PTlRIX1BJQ0tFUiA9IGAuJHtDQUxFTkRBUl9NT05USF9QSUNLRVJfQ0xBU1N9YDtcbmNvbnN0IENBTEVOREFSX1lFQVJfUElDS0VSID0gYC4ke0NBTEVOREFSX1lFQVJfUElDS0VSX0NMQVNTfWA7XG5jb25zdCBDQUxFTkRBUl9NT05USF9GT0NVU0VEID0gYC4ke0NBTEVOREFSX01PTlRIX0ZPQ1VTRURfQ0xBU1N9YDtcbmNvbnN0IENBTEVOREFSX1lFQVJfRk9DVVNFRCA9IGAuJHtDQUxFTkRBUl9ZRUFSX0ZPQ1VTRURfQ0xBU1N9YDtcblxuY29uc3QgVkFMSURBVElPTl9NRVNTQUdFID0gXCJQbGVhc2UgZW50ZXIgYSB2YWxpZCBkYXRlXCI7XG5cbmNvbnN0IE1PTlRIX0xBQkVMUyA9IFtcbiAgXCJKYW51YXJ5XCIsXG4gIFwiRmVicnVhcnlcIixcbiAgXCJNYXJjaFwiLFxuICBcIkFwcmlsXCIsXG4gIFwiTWF5XCIsXG4gIFwiSnVuZVwiLFxuICBcIkp1bHlcIixcbiAgXCJBdWd1c3RcIixcbiAgXCJTZXB0ZW1iZXJcIixcbiAgXCJPY3RvYmVyXCIsXG4gIFwiTm92ZW1iZXJcIixcbiAgXCJEZWNlbWJlclwiLFxuXTtcblxuY29uc3QgREFZX09GX1dFRUtfTEFCRUxTID0gW1xuICBcIlN1bmRheVwiLFxuICBcIk1vbmRheVwiLFxuICBcIlR1ZXNkYXlcIixcbiAgXCJXZWRuZXNkYXlcIixcbiAgXCJUaHVyc2RheVwiLFxuICBcIkZyaWRheVwiLFxuICBcIlNhdHVyZGF5XCIsXG5dO1xuXG5jb25zdCBFTlRFUl9LRVlDT0RFID0gMTM7XG5cbmNvbnN0IFlFQVJfQ0hVTksgPSAxMjtcblxuY29uc3QgREVGQVVMVF9NSU5fREFURSA9IFwiMDAwMC0wMS0wMVwiO1xuY29uc3QgREVGQVVMVF9FWFRFUk5BTF9EQVRFX0ZPUk1BVCA9IFwiTU0vREQvWVlZWVwiO1xuY29uc3QgSU5URVJOQUxfREFURV9GT1JNQVQgPSBcIllZWVktTU0tRERcIjtcblxuY29uc3QgTk9UX0RJU0FCTEVEX1NFTEVDVE9SID0gXCI6bm90KFtkaXNhYmxlZF0pXCI7XG5cbmNvbnN0IHByb2Nlc3NGb2N1c2FibGVTZWxlY3RvcnMgPSAoLi4uc2VsZWN0b3JzKSA9PlxuICBzZWxlY3RvcnMubWFwKChxdWVyeSkgPT4gcXVlcnkgKyBOT1RfRElTQUJMRURfU0VMRUNUT1IpLmpvaW4oXCIsIFwiKTtcblxuY29uc3QgREFURV9QSUNLRVJfRk9DVVNBQkxFID0gcHJvY2Vzc0ZvY3VzYWJsZVNlbGVjdG9ycyhcbiAgQ0FMRU5EQVJfUFJFVklPVVNfWUVBUixcbiAgQ0FMRU5EQVJfUFJFVklPVVNfTU9OVEgsXG4gIENBTEVOREFSX1lFQVJfU0VMRUNUSU9OLFxuICBDQUxFTkRBUl9NT05USF9TRUxFQ1RJT04sXG4gIENBTEVOREFSX05FWFRfWUVBUixcbiAgQ0FMRU5EQVJfTkVYVF9NT05USCxcbiAgQ0FMRU5EQVJfREFURV9GT0NVU0VEXG4pO1xuXG5jb25zdCBNT05USF9QSUNLRVJfRk9DVVNBQkxFID0gcHJvY2Vzc0ZvY3VzYWJsZVNlbGVjdG9ycyhcbiAgQ0FMRU5EQVJfTU9OVEhfRk9DVVNFRFxuKTtcblxuY29uc3QgWUVBUl9QSUNLRVJfRk9DVVNBQkxFID0gcHJvY2Vzc0ZvY3VzYWJsZVNlbGVjdG9ycyhcbiAgQ0FMRU5EQVJfUFJFVklPVVNfWUVBUl9DSFVOSyxcbiAgQ0FMRU5EQVJfTkVYVF9ZRUFSX0NIVU5LLFxuICBDQUxFTkRBUl9ZRUFSX0ZPQ1VTRURcbik7XG5cbi8vICNyZWdpb24gRGF0ZSBNYW5pcHVsYXRpb24gRnVuY3Rpb25zXG5cbi8qKlxuICogS2VlcCBkYXRlIHdpdGhpbiBtb250aC4gTW9udGggd291bGQgb25seSBiZSBvdmVyIGJ5IDEgdG8gMyBkYXlzXG4gKlxuICogQHBhcmFtIHtEYXRlfSBkYXRlVG9DaGVjayB0aGUgZGF0ZSBvYmplY3QgdG8gY2hlY2tcbiAqIEBwYXJhbSB7bnVtYmVyfSBtb250aCB0aGUgY29ycmVjdCBtb250aFxuICogQHJldHVybnMge0RhdGV9IHRoZSBkYXRlLCBjb3JyZWN0ZWQgaWYgbmVlZGVkXG4gKi9cbmNvbnN0IGtlZXBEYXRlV2l0aGluTW9udGggPSAoZGF0ZVRvQ2hlY2ssIG1vbnRoKSA9PiB7XG4gIGlmIChtb250aCAhPT0gZGF0ZVRvQ2hlY2suZ2V0TW9udGgoKSkge1xuICAgIGRhdGVUb0NoZWNrLnNldERhdGUoMCk7XG4gIH1cblxuICByZXR1cm4gZGF0ZVRvQ2hlY2s7XG59O1xuXG4vKipcbiAqIFNldCBkYXRlIGZyb20gbW9udGggZGF5IHllYXJcbiAqXG4gKiBAcGFyYW0ge251bWJlcn0geWVhciB0aGUgeWVhciB0byBzZXRcbiAqIEBwYXJhbSB7bnVtYmVyfSBtb250aCB0aGUgbW9udGggdG8gc2V0ICh6ZXJvLWluZGV4ZWQpXG4gKiBAcGFyYW0ge251bWJlcn0gZGF0ZSB0aGUgZGF0ZSB0byBzZXRcbiAqIEByZXR1cm5zIHtEYXRlfSB0aGUgc2V0IGRhdGVcbiAqL1xuY29uc3Qgc2V0RGF0ZSA9ICh5ZWFyLCBtb250aCwgZGF0ZSkgPT4ge1xuICBjb25zdCBuZXdEYXRlID0gbmV3IERhdGUoMCk7XG4gIG5ld0RhdGUuc2V0RnVsbFllYXIoeWVhciwgbW9udGgsIGRhdGUpO1xuICByZXR1cm4gbmV3RGF0ZTtcbn07XG5cbi8qKlxuICogdG9kYXlzIGRhdGVcbiAqXG4gKiBAcmV0dXJucyB7RGF0ZX0gdG9kYXlzIGRhdGVcbiAqL1xuY29uc3QgdG9kYXkgPSAoKSA9PiB7XG4gIGNvbnN0IG5ld0RhdGUgPSBuZXcgRGF0ZSgpO1xuICBjb25zdCBkYXkgPSBuZXdEYXRlLmdldERhdGUoKTtcbiAgY29uc3QgbW9udGggPSBuZXdEYXRlLmdldE1vbnRoKCk7XG4gIGNvbnN0IHllYXIgPSBuZXdEYXRlLmdldEZ1bGxZZWFyKCk7XG4gIHJldHVybiBzZXREYXRlKHllYXIsIG1vbnRoLCBkYXkpO1xufTtcblxuLyoqXG4gKiBTZXQgZGF0ZSB0byBmaXJzdCBkYXkgb2YgdGhlIG1vbnRoXG4gKlxuICogQHBhcmFtIHtudW1iZXJ9IGRhdGUgdGhlIGRhdGUgdG8gYWRqdXN0XG4gKiBAcmV0dXJucyB7RGF0ZX0gdGhlIGFkanVzdGVkIGRhdGVcbiAqL1xuY29uc3Qgc3RhcnRPZk1vbnRoID0gKGRhdGUpID0+IHtcbiAgY29uc3QgbmV3RGF0ZSA9IG5ldyBEYXRlKDApO1xuICBuZXdEYXRlLnNldEZ1bGxZZWFyKGRhdGUuZ2V0RnVsbFllYXIoKSwgZGF0ZS5nZXRNb250aCgpLCAxKTtcbiAgcmV0dXJuIG5ld0RhdGU7XG59O1xuXG4vKipcbiAqIFNldCBkYXRlIHRvIGxhc3QgZGF5IG9mIHRoZSBtb250aFxuICpcbiAqIEBwYXJhbSB7bnVtYmVyfSBkYXRlIHRoZSBkYXRlIHRvIGFkanVzdFxuICogQHJldHVybnMge0RhdGV9IHRoZSBhZGp1c3RlZCBkYXRlXG4gKi9cbmNvbnN0IGxhc3REYXlPZk1vbnRoID0gKGRhdGUpID0+IHtcbiAgY29uc3QgbmV3RGF0ZSA9IG5ldyBEYXRlKDApO1xuICBuZXdEYXRlLnNldEZ1bGxZZWFyKGRhdGUuZ2V0RnVsbFllYXIoKSwgZGF0ZS5nZXRNb250aCgpICsgMSwgMCk7XG4gIHJldHVybiBuZXdEYXRlO1xufTtcblxuLyoqXG4gKiBBZGQgZGF5cyB0byBkYXRlXG4gKlxuICogQHBhcmFtIHtEYXRlfSBfZGF0ZSB0aGUgZGF0ZSB0byBhZGp1c3RcbiAqIEBwYXJhbSB7bnVtYmVyfSBudW1EYXlzIHRoZSBkaWZmZXJlbmNlIGluIGRheXNcbiAqIEByZXR1cm5zIHtEYXRlfSB0aGUgYWRqdXN0ZWQgZGF0ZVxuICovXG5jb25zdCBhZGREYXlzID0gKF9kYXRlLCBudW1EYXlzKSA9PiB7XG4gIGNvbnN0IG5ld0RhdGUgPSBuZXcgRGF0ZShfZGF0ZS5nZXRUaW1lKCkpO1xuICBuZXdEYXRlLnNldERhdGUobmV3RGF0ZS5nZXREYXRlKCkgKyBudW1EYXlzKTtcbiAgcmV0dXJuIG5ld0RhdGU7XG59O1xuXG4vKipcbiAqIFN1YnRyYWN0IGRheXMgZnJvbSBkYXRlXG4gKlxuICogQHBhcmFtIHtEYXRlfSBfZGF0ZSB0aGUgZGF0ZSB0byBhZGp1c3RcbiAqIEBwYXJhbSB7bnVtYmVyfSBudW1EYXlzIHRoZSBkaWZmZXJlbmNlIGluIGRheXNcbiAqIEByZXR1cm5zIHtEYXRlfSB0aGUgYWRqdXN0ZWQgZGF0ZVxuICovXG5jb25zdCBzdWJEYXlzID0gKF9kYXRlLCBudW1EYXlzKSA9PiBhZGREYXlzKF9kYXRlLCAtbnVtRGF5cyk7XG5cbi8qKlxuICogQWRkIHdlZWtzIHRvIGRhdGVcbiAqXG4gKiBAcGFyYW0ge0RhdGV9IF9kYXRlIHRoZSBkYXRlIHRvIGFkanVzdFxuICogQHBhcmFtIHtudW1iZXJ9IG51bVdlZWtzIHRoZSBkaWZmZXJlbmNlIGluIHdlZWtzXG4gKiBAcmV0dXJucyB7RGF0ZX0gdGhlIGFkanVzdGVkIGRhdGVcbiAqL1xuY29uc3QgYWRkV2Vla3MgPSAoX2RhdGUsIG51bVdlZWtzKSA9PiBhZGREYXlzKF9kYXRlLCBudW1XZWVrcyAqIDcpO1xuXG4vKipcbiAqIFN1YnRyYWN0IHdlZWtzIGZyb20gZGF0ZVxuICpcbiAqIEBwYXJhbSB7RGF0ZX0gX2RhdGUgdGhlIGRhdGUgdG8gYWRqdXN0XG4gKiBAcGFyYW0ge251bWJlcn0gbnVtV2Vla3MgdGhlIGRpZmZlcmVuY2UgaW4gd2Vla3NcbiAqIEByZXR1cm5zIHtEYXRlfSB0aGUgYWRqdXN0ZWQgZGF0ZVxuICovXG5jb25zdCBzdWJXZWVrcyA9IChfZGF0ZSwgbnVtV2Vla3MpID0+IGFkZFdlZWtzKF9kYXRlLCAtbnVtV2Vla3MpO1xuXG4vKipcbiAqIFNldCBkYXRlIHRvIHRoZSBzdGFydCBvZiB0aGUgd2VlayAoU3VuZGF5KVxuICpcbiAqIEBwYXJhbSB7RGF0ZX0gX2RhdGUgdGhlIGRhdGUgdG8gYWRqdXN0XG4gKiBAcmV0dXJucyB7RGF0ZX0gdGhlIGFkanVzdGVkIGRhdGVcbiAqL1xuY29uc3Qgc3RhcnRPZldlZWsgPSAoX2RhdGUpID0+IHtcbiAgY29uc3QgZGF5T2ZXZWVrID0gX2RhdGUuZ2V0RGF5KCk7XG4gIHJldHVybiBzdWJEYXlzKF9kYXRlLCBkYXlPZldlZWspO1xufTtcblxuLyoqXG4gKiBTZXQgZGF0ZSB0byB0aGUgZW5kIG9mIHRoZSB3ZWVrIChTYXR1cmRheSlcbiAqXG4gKiBAcGFyYW0ge0RhdGV9IF9kYXRlIHRoZSBkYXRlIHRvIGFkanVzdFxuICogQHBhcmFtIHtudW1iZXJ9IG51bVdlZWtzIHRoZSBkaWZmZXJlbmNlIGluIHdlZWtzXG4gKiBAcmV0dXJucyB7RGF0ZX0gdGhlIGFkanVzdGVkIGRhdGVcbiAqL1xuY29uc3QgZW5kT2ZXZWVrID0gKF9kYXRlKSA9PiB7XG4gIGNvbnN0IGRheU9mV2VlayA9IF9kYXRlLmdldERheSgpO1xuICByZXR1cm4gYWRkRGF5cyhfZGF0ZSwgNiAtIGRheU9mV2Vlayk7XG59O1xuXG4vKipcbiAqIEFkZCBtb250aHMgdG8gZGF0ZSBhbmQga2VlcCBkYXRlIHdpdGhpbiBtb250aFxuICpcbiAqIEBwYXJhbSB7RGF0ZX0gX2RhdGUgdGhlIGRhdGUgdG8gYWRqdXN0XG4gKiBAcGFyYW0ge251bWJlcn0gbnVtTW9udGhzIHRoZSBkaWZmZXJlbmNlIGluIG1vbnRoc1xuICogQHJldHVybnMge0RhdGV9IHRoZSBhZGp1c3RlZCBkYXRlXG4gKi9cbmNvbnN0IGFkZE1vbnRocyA9IChfZGF0ZSwgbnVtTW9udGhzKSA9PiB7XG4gIGNvbnN0IG5ld0RhdGUgPSBuZXcgRGF0ZShfZGF0ZS5nZXRUaW1lKCkpO1xuXG4gIGNvbnN0IGRhdGVNb250aCA9IChuZXdEYXRlLmdldE1vbnRoKCkgKyAxMiArIG51bU1vbnRocykgJSAxMjtcbiAgbmV3RGF0ZS5zZXRNb250aChuZXdEYXRlLmdldE1vbnRoKCkgKyBudW1Nb250aHMpO1xuICBrZWVwRGF0ZVdpdGhpbk1vbnRoKG5ld0RhdGUsIGRhdGVNb250aCk7XG5cbiAgcmV0dXJuIG5ld0RhdGU7XG59O1xuXG4vKipcbiAqIFN1YnRyYWN0IG1vbnRocyBmcm9tIGRhdGVcbiAqXG4gKiBAcGFyYW0ge0RhdGV9IF9kYXRlIHRoZSBkYXRlIHRvIGFkanVzdFxuICogQHBhcmFtIHtudW1iZXJ9IG51bU1vbnRocyB0aGUgZGlmZmVyZW5jZSBpbiBtb250aHNcbiAqIEByZXR1cm5zIHtEYXRlfSB0aGUgYWRqdXN0ZWQgZGF0ZVxuICovXG5jb25zdCBzdWJNb250aHMgPSAoX2RhdGUsIG51bU1vbnRocykgPT4gYWRkTW9udGhzKF9kYXRlLCAtbnVtTW9udGhzKTtcblxuLyoqXG4gKiBBZGQgeWVhcnMgdG8gZGF0ZSBhbmQga2VlcCBkYXRlIHdpdGhpbiBtb250aFxuICpcbiAqIEBwYXJhbSB7RGF0ZX0gX2RhdGUgdGhlIGRhdGUgdG8gYWRqdXN0XG4gKiBAcGFyYW0ge251bWJlcn0gbnVtWWVhcnMgdGhlIGRpZmZlcmVuY2UgaW4geWVhcnNcbiAqIEByZXR1cm5zIHtEYXRlfSB0aGUgYWRqdXN0ZWQgZGF0ZVxuICovXG5jb25zdCBhZGRZZWFycyA9IChfZGF0ZSwgbnVtWWVhcnMpID0+IGFkZE1vbnRocyhfZGF0ZSwgbnVtWWVhcnMgKiAxMik7XG5cbi8qKlxuICogU3VidHJhY3QgeWVhcnMgZnJvbSBkYXRlXG4gKlxuICogQHBhcmFtIHtEYXRlfSBfZGF0ZSB0aGUgZGF0ZSB0byBhZGp1c3RcbiAqIEBwYXJhbSB7bnVtYmVyfSBudW1ZZWFycyB0aGUgZGlmZmVyZW5jZSBpbiB5ZWFyc1xuICogQHJldHVybnMge0RhdGV9IHRoZSBhZGp1c3RlZCBkYXRlXG4gKi9cbmNvbnN0IHN1YlllYXJzID0gKF9kYXRlLCBudW1ZZWFycykgPT4gYWRkWWVhcnMoX2RhdGUsIC1udW1ZZWFycyk7XG5cbi8qKlxuICogU2V0IG1vbnRocyBvZiBkYXRlXG4gKlxuICogQHBhcmFtIHtEYXRlfSBfZGF0ZSB0aGUgZGF0ZSB0byBhZGp1c3RcbiAqIEBwYXJhbSB7bnVtYmVyfSBtb250aCB6ZXJvLWluZGV4ZWQgbW9udGggdG8gc2V0XG4gKiBAcmV0dXJucyB7RGF0ZX0gdGhlIGFkanVzdGVkIGRhdGVcbiAqL1xuY29uc3Qgc2V0TW9udGggPSAoX2RhdGUsIG1vbnRoKSA9PiB7XG4gIGNvbnN0IG5ld0RhdGUgPSBuZXcgRGF0ZShfZGF0ZS5nZXRUaW1lKCkpO1xuXG4gIG5ld0RhdGUuc2V0TW9udGgobW9udGgpO1xuICBrZWVwRGF0ZVdpdGhpbk1vbnRoKG5ld0RhdGUsIG1vbnRoKTtcblxuICByZXR1cm4gbmV3RGF0ZTtcbn07XG5cbi8qKlxuICogU2V0IHllYXIgb2YgZGF0ZVxuICpcbiAqIEBwYXJhbSB7RGF0ZX0gX2RhdGUgdGhlIGRhdGUgdG8gYWRqdXN0XG4gKiBAcGFyYW0ge251bWJlcn0geWVhciB0aGUgeWVhciB0byBzZXRcbiAqIEByZXR1cm5zIHtEYXRlfSB0aGUgYWRqdXN0ZWQgZGF0ZVxuICovXG5jb25zdCBzZXRZZWFyID0gKF9kYXRlLCB5ZWFyKSA9PiB7XG4gIGNvbnN0IG5ld0RhdGUgPSBuZXcgRGF0ZShfZGF0ZS5nZXRUaW1lKCkpO1xuXG4gIGNvbnN0IG1vbnRoID0gbmV3RGF0ZS5nZXRNb250aCgpO1xuICBuZXdEYXRlLnNldEZ1bGxZZWFyKHllYXIpO1xuICBrZWVwRGF0ZVdpdGhpbk1vbnRoKG5ld0RhdGUsIG1vbnRoKTtcblxuICByZXR1cm4gbmV3RGF0ZTtcbn07XG5cbi8qKlxuICogUmV0dXJuIHRoZSBlYXJsaWVzdCBkYXRlXG4gKlxuICogQHBhcmFtIHtEYXRlfSBkYXRlQSBkYXRlIHRvIGNvbXBhcmVcbiAqIEBwYXJhbSB7RGF0ZX0gZGF0ZUIgZGF0ZSB0byBjb21wYXJlXG4gKiBAcmV0dXJucyB7RGF0ZX0gdGhlIGVhcmxpZXN0IGRhdGVcbiAqL1xuY29uc3QgbWluID0gKGRhdGVBLCBkYXRlQikgPT4ge1xuICBsZXQgbmV3RGF0ZSA9IGRhdGVBO1xuXG4gIGlmIChkYXRlQiA8IGRhdGVBKSB7XG4gICAgbmV3RGF0ZSA9IGRhdGVCO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBEYXRlKG5ld0RhdGUuZ2V0VGltZSgpKTtcbn07XG5cbi8qKlxuICogUmV0dXJuIHRoZSBsYXRlc3QgZGF0ZVxuICpcbiAqIEBwYXJhbSB7RGF0ZX0gZGF0ZUEgZGF0ZSB0byBjb21wYXJlXG4gKiBAcGFyYW0ge0RhdGV9IGRhdGVCIGRhdGUgdG8gY29tcGFyZVxuICogQHJldHVybnMge0RhdGV9IHRoZSBsYXRlc3QgZGF0ZVxuICovXG5jb25zdCBtYXggPSAoZGF0ZUEsIGRhdGVCKSA9PiB7XG4gIGxldCBuZXdEYXRlID0gZGF0ZUE7XG5cbiAgaWYgKGRhdGVCID4gZGF0ZUEpIHtcbiAgICBuZXdEYXRlID0gZGF0ZUI7XG4gIH1cblxuICByZXR1cm4gbmV3IERhdGUobmV3RGF0ZS5nZXRUaW1lKCkpO1xufTtcblxuLyoqXG4gKiBDaGVjayBpZiBkYXRlcyBhcmUgdGhlIGluIHRoZSBzYW1lIHllYXJcbiAqXG4gKiBAcGFyYW0ge0RhdGV9IGRhdGVBIGRhdGUgdG8gY29tcGFyZVxuICogQHBhcmFtIHtEYXRlfSBkYXRlQiBkYXRlIHRvIGNvbXBhcmVcbiAqIEByZXR1cm5zIHtib29sZWFufSBhcmUgZGF0ZXMgaW4gdGhlIHNhbWUgeWVhclxuICovXG5jb25zdCBpc1NhbWVZZWFyID0gKGRhdGVBLCBkYXRlQikgPT5cbiAgZGF0ZUEgJiYgZGF0ZUIgJiYgZGF0ZUEuZ2V0RnVsbFllYXIoKSA9PT0gZGF0ZUIuZ2V0RnVsbFllYXIoKTtcblxuLyoqXG4gKiBDaGVjayBpZiBkYXRlcyBhcmUgdGhlIGluIHRoZSBzYW1lIG1vbnRoXG4gKlxuICogQHBhcmFtIHtEYXRlfSBkYXRlQSBkYXRlIHRvIGNvbXBhcmVcbiAqIEBwYXJhbSB7RGF0ZX0gZGF0ZUIgZGF0ZSB0byBjb21wYXJlXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gYXJlIGRhdGVzIGluIHRoZSBzYW1lIG1vbnRoXG4gKi9cbmNvbnN0IGlzU2FtZU1vbnRoID0gKGRhdGVBLCBkYXRlQikgPT5cbiAgaXNTYW1lWWVhcihkYXRlQSwgZGF0ZUIpICYmIGRhdGVBLmdldE1vbnRoKCkgPT09IGRhdGVCLmdldE1vbnRoKCk7XG5cbi8qKlxuICogQ2hlY2sgaWYgZGF0ZXMgYXJlIHRoZSBzYW1lIGRhdGVcbiAqXG4gKiBAcGFyYW0ge0RhdGV9IGRhdGVBIHRoZSBkYXRlIHRvIGNvbXBhcmVcbiAqIEBwYXJhbSB7RGF0ZX0gZGF0ZUEgdGhlIGRhdGUgdG8gY29tcGFyZVxuICogQHJldHVybnMge2Jvb2xlYW59IGFyZSBkYXRlcyB0aGUgc2FtZSBkYXRlXG4gKi9cbmNvbnN0IGlzU2FtZURheSA9IChkYXRlQSwgZGF0ZUIpID0+XG4gIGlzU2FtZU1vbnRoKGRhdGVBLCBkYXRlQikgJiYgZGF0ZUEuZ2V0RGF0ZSgpID09PSBkYXRlQi5nZXREYXRlKCk7XG5cbi8qKlxuICogcmV0dXJuIGEgbmV3IGRhdGUgd2l0aGluIG1pbmltdW0gYW5kIG1heGltdW0gZGF0ZVxuICpcbiAqIEBwYXJhbSB7RGF0ZX0gZGF0ZSBkYXRlIHRvIGNoZWNrXG4gKiBAcGFyYW0ge0RhdGV9IG1pbkRhdGUgbWluaW11bSBkYXRlIHRvIGFsbG93XG4gKiBAcGFyYW0ge0RhdGV9IG1heERhdGUgbWF4aW11bSBkYXRlIHRvIGFsbG93XG4gKiBAcmV0dXJucyB7RGF0ZX0gdGhlIGRhdGUgYmV0d2VlbiBtaW4gYW5kIG1heFxuICovXG5jb25zdCBrZWVwRGF0ZUJldHdlZW5NaW5BbmRNYXggPSAoZGF0ZSwgbWluRGF0ZSwgbWF4RGF0ZSkgPT4ge1xuICBsZXQgbmV3RGF0ZSA9IGRhdGU7XG5cbiAgaWYgKGRhdGUgPCBtaW5EYXRlKSB7XG4gICAgbmV3RGF0ZSA9IG1pbkRhdGU7XG4gIH0gZWxzZSBpZiAobWF4RGF0ZSAmJiBkYXRlID4gbWF4RGF0ZSkge1xuICAgIG5ld0RhdGUgPSBtYXhEYXRlO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBEYXRlKG5ld0RhdGUuZ2V0VGltZSgpKTtcbn07XG5cbi8qKlxuICogQ2hlY2sgaWYgZGF0ZXMgaXMgdmFsaWQuXG4gKlxuICogQHBhcmFtIHtEYXRlfSBkYXRlIGRhdGUgdG8gY2hlY2tcbiAqIEBwYXJhbSB7RGF0ZX0gbWluRGF0ZSBtaW5pbXVtIGRhdGUgdG8gYWxsb3dcbiAqIEBwYXJhbSB7RGF0ZX0gbWF4RGF0ZSBtYXhpbXVtIGRhdGUgdG8gYWxsb3dcbiAqIEByZXR1cm4ge2Jvb2xlYW59IGlzIHRoZXJlIGEgZGF5IHdpdGhpbiB0aGUgbW9udGggd2l0aGluIG1pbiBhbmQgbWF4IGRhdGVzXG4gKi9cbmNvbnN0IGlzRGF0ZVdpdGhpbk1pbkFuZE1heCA9IChkYXRlLCBtaW5EYXRlLCBtYXhEYXRlKSA9PlxuICBkYXRlID49IG1pbkRhdGUgJiYgKCFtYXhEYXRlIHx8IGRhdGUgPD0gbWF4RGF0ZSk7XG5cbi8qKlxuICogQ2hlY2sgaWYgZGF0ZXMgbW9udGggaXMgaW52YWxpZC5cbiAqXG4gKiBAcGFyYW0ge0RhdGV9IGRhdGUgZGF0ZSB0byBjaGVja1xuICogQHBhcmFtIHtEYXRlfSBtaW5EYXRlIG1pbmltdW0gZGF0ZSB0byBhbGxvd1xuICogQHBhcmFtIHtEYXRlfSBtYXhEYXRlIG1heGltdW0gZGF0ZSB0byBhbGxvd1xuICogQHJldHVybiB7Ym9vbGVhbn0gaXMgdGhlIG1vbnRoIG91dHNpZGUgbWluIG9yIG1heCBkYXRlc1xuICovXG5jb25zdCBpc0RhdGVzTW9udGhPdXRzaWRlTWluT3JNYXggPSAoZGF0ZSwgbWluRGF0ZSwgbWF4RGF0ZSkgPT5cbiAgbGFzdERheU9mTW9udGgoZGF0ZSkgPCBtaW5EYXRlIHx8IChtYXhEYXRlICYmIHN0YXJ0T2ZNb250aChkYXRlKSA+IG1heERhdGUpO1xuXG4vKipcbiAqIENoZWNrIGlmIGRhdGVzIHllYXIgaXMgaW52YWxpZC5cbiAqXG4gKiBAcGFyYW0ge0RhdGV9IGRhdGUgZGF0ZSB0byBjaGVja1xuICogQHBhcmFtIHtEYXRlfSBtaW5EYXRlIG1pbmltdW0gZGF0ZSB0byBhbGxvd1xuICogQHBhcmFtIHtEYXRlfSBtYXhEYXRlIG1heGltdW0gZGF0ZSB0byBhbGxvd1xuICogQHJldHVybiB7Ym9vbGVhbn0gaXMgdGhlIG1vbnRoIG91dHNpZGUgbWluIG9yIG1heCBkYXRlc1xuICovXG5jb25zdCBpc0RhdGVzWWVhck91dHNpZGVNaW5Pck1heCA9IChkYXRlLCBtaW5EYXRlLCBtYXhEYXRlKSA9PlxuICBsYXN0RGF5T2ZNb250aChzZXRNb250aChkYXRlLCAxMSkpIDwgbWluRGF0ZSB8fFxuICAobWF4RGF0ZSAmJiBzdGFydE9mTW9udGgoc2V0TW9udGgoZGF0ZSwgMCkpID4gbWF4RGF0ZSk7XG5cbi8qKlxuICogUGFyc2UgYSBkYXRlIHdpdGggZm9ybWF0IE0tRC1ZWVxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBkYXRlU3RyaW5nIHRoZSBkYXRlIHN0cmluZyB0byBwYXJzZVxuICogQHBhcmFtIHtzdHJpbmd9IGRhdGVGb3JtYXQgdGhlIGZvcm1hdCBvZiB0aGUgZGF0ZSBzdHJpbmdcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gYWRqdXN0RGF0ZSBzaG91bGQgdGhlIGRhdGUgYmUgYWRqdXN0ZWRcbiAqIEByZXR1cm5zIHtEYXRlfSB0aGUgcGFyc2VkIGRhdGVcbiAqL1xuY29uc3QgcGFyc2VEYXRlU3RyaW5nID0gKFxuICBkYXRlU3RyaW5nLFxuICBkYXRlRm9ybWF0ID0gSU5URVJOQUxfREFURV9GT1JNQVQsXG4gIGFkanVzdERhdGUgPSBmYWxzZVxuKSA9PiB7XG4gIGxldCBkYXRlO1xuICBsZXQgbW9udGg7XG4gIGxldCBkYXk7XG4gIGxldCB5ZWFyO1xuICBsZXQgcGFyc2VkO1xuXG4gIGlmIChkYXRlU3RyaW5nKSB7XG4gICAgbGV0IG1vbnRoU3RyO1xuICAgIGxldCBkYXlTdHI7XG4gICAgbGV0IHllYXJTdHI7XG5cbiAgICBpZiAoZGF0ZUZvcm1hdCA9PT0gREVGQVVMVF9FWFRFUk5BTF9EQVRFX0ZPUk1BVCkge1xuICAgICAgW21vbnRoU3RyLCBkYXlTdHIsIHllYXJTdHJdID0gZGF0ZVN0cmluZy5zcGxpdChcIi9cIik7XG4gICAgfSBlbHNlIHtcbiAgICAgIFt5ZWFyU3RyLCBtb250aFN0ciwgZGF5U3RyXSA9IGRhdGVTdHJpbmcuc3BsaXQoXCItXCIpO1xuICAgIH1cblxuICAgIGlmICh5ZWFyU3RyKSB7XG4gICAgICBwYXJzZWQgPSBwYXJzZUludCh5ZWFyU3RyLCAxMCk7XG4gICAgICBpZiAoIU51bWJlci5pc05hTihwYXJzZWQpKSB7XG4gICAgICAgIHllYXIgPSBwYXJzZWQ7XG4gICAgICAgIGlmIChhZGp1c3REYXRlKSB7XG4gICAgICAgICAgeWVhciA9IE1hdGgubWF4KDAsIHllYXIpO1xuICAgICAgICAgIGlmICh5ZWFyU3RyLmxlbmd0aCA8IDMpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRZZWFyID0gdG9kYXkoKS5nZXRGdWxsWWVhcigpO1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFllYXJTdHViID1cbiAgICAgICAgICAgICAgY3VycmVudFllYXIgLSAoY3VycmVudFllYXIgJSAxMCAqKiB5ZWFyU3RyLmxlbmd0aCk7XG4gICAgICAgICAgICB5ZWFyID0gY3VycmVudFllYXJTdHViICsgcGFyc2VkO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChtb250aFN0cikge1xuICAgICAgcGFyc2VkID0gcGFyc2VJbnQobW9udGhTdHIsIDEwKTtcbiAgICAgIGlmICghTnVtYmVyLmlzTmFOKHBhcnNlZCkpIHtcbiAgICAgICAgbW9udGggPSBwYXJzZWQ7XG4gICAgICAgIGlmIChhZGp1c3REYXRlKSB7XG4gICAgICAgICAgbW9udGggPSBNYXRoLm1heCgxLCBtb250aCk7XG4gICAgICAgICAgbW9udGggPSBNYXRoLm1pbigxMiwgbW9udGgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG1vbnRoICYmIGRheVN0ciAmJiB5ZWFyICE9IG51bGwpIHtcbiAgICAgIHBhcnNlZCA9IHBhcnNlSW50KGRheVN0ciwgMTApO1xuICAgICAgaWYgKCFOdW1iZXIuaXNOYU4ocGFyc2VkKSkge1xuICAgICAgICBkYXkgPSBwYXJzZWQ7XG4gICAgICAgIGlmIChhZGp1c3REYXRlKSB7XG4gICAgICAgICAgY29uc3QgbGFzdERheU9mVGhlTW9udGggPSBzZXREYXRlKHllYXIsIG1vbnRoLCAwKS5nZXREYXRlKCk7XG4gICAgICAgICAgZGF5ID0gTWF0aC5tYXgoMSwgZGF5KTtcbiAgICAgICAgICBkYXkgPSBNYXRoLm1pbihsYXN0RGF5T2ZUaGVNb250aCwgZGF5KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChtb250aCAmJiBkYXkgJiYgeWVhciAhPSBudWxsKSB7XG4gICAgICBkYXRlID0gc2V0RGF0ZSh5ZWFyLCBtb250aCAtIDEsIGRheSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGRhdGU7XG59O1xuXG4vKipcbiAqIEZvcm1hdCBhIGRhdGUgdG8gZm9ybWF0IE1NLURELVlZWVlcbiAqXG4gKiBAcGFyYW0ge0RhdGV9IGRhdGUgdGhlIGRhdGUgdG8gZm9ybWF0XG4gKiBAcGFyYW0ge3N0cmluZ30gZGF0ZUZvcm1hdCB0aGUgZm9ybWF0IG9mIHRoZSBkYXRlIHN0cmluZ1xuICogQHJldHVybnMge3N0cmluZ30gdGhlIGZvcm1hdHRlZCBkYXRlIHN0cmluZ1xuICovXG5jb25zdCBmb3JtYXREYXRlID0gKGRhdGUsIGRhdGVGb3JtYXQgPSBJTlRFUk5BTF9EQVRFX0ZPUk1BVCkgPT4ge1xuICBjb25zdCBwYWRaZXJvcyA9ICh2YWx1ZSwgbGVuZ3RoKSA9PiBgMDAwMCR7dmFsdWV9YC5zbGljZSgtbGVuZ3RoKTtcblxuICBjb25zdCBtb250aCA9IGRhdGUuZ2V0TW9udGgoKSArIDE7XG4gIGNvbnN0IGRheSA9IGRhdGUuZ2V0RGF0ZSgpO1xuICBjb25zdCB5ZWFyID0gZGF0ZS5nZXRGdWxsWWVhcigpO1xuXG4gIGlmIChkYXRlRm9ybWF0ID09PSBERUZBVUxUX0VYVEVSTkFMX0RBVEVfRk9STUFUKSB7XG4gICAgcmV0dXJuIFtwYWRaZXJvcyhtb250aCwgMiksIHBhZFplcm9zKGRheSwgMiksIHBhZFplcm9zKHllYXIsIDQpXS5qb2luKFwiL1wiKTtcbiAgfVxuXG4gIHJldHVybiBbcGFkWmVyb3MoeWVhciwgNCksIHBhZFplcm9zKG1vbnRoLCAyKSwgcGFkWmVyb3MoZGF5LCAyKV0uam9pbihcIi1cIik7XG59O1xuXG4vLyAjZW5kcmVnaW9uIERhdGUgTWFuaXB1bGF0aW9uIEZ1bmN0aW9uc1xuXG4vKipcbiAqIENyZWF0ZSBhIGdyaWQgc3RyaW5nIGZyb20gYW4gYXJyYXkgb2YgaHRtbCBzdHJpbmdzXG4gKlxuICogQHBhcmFtIHtzdHJpbmdbXX0gaHRtbEFycmF5IHRoZSBhcnJheSBvZiBodG1sIGl0ZW1zXG4gKiBAcGFyYW0ge251bWJlcn0gcm93U2l6ZSB0aGUgbGVuZ3RoIG9mIGEgcm93XG4gKiBAcmV0dXJucyB7c3RyaW5nfSB0aGUgZ3JpZCBzdHJpbmdcbiAqL1xuY29uc3QgbGlzdFRvR3JpZEh0bWwgPSAoaHRtbEFycmF5LCByb3dTaXplKSA9PiB7XG4gIGNvbnN0IGdyaWQgPSBbXTtcbiAgbGV0IHJvdyA9IFtdO1xuXG4gIGxldCBpID0gMDtcbiAgd2hpbGUgKGkgPCBodG1sQXJyYXkubGVuZ3RoKSB7XG4gICAgcm93ID0gW107XG5cbiAgICBjb25zdCB0ciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJ0clwiKTtcbiAgICB3aGlsZSAoaSA8IGh0bWxBcnJheS5sZW5ndGggJiYgcm93Lmxlbmd0aCA8IHJvd1NpemUpIHtcbiAgICAgIGNvbnN0IHRkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInRkXCIpO1xuICAgICAgdGQuaW5zZXJ0QWRqYWNlbnRFbGVtZW50KFwiYmVmb3JlZW5kXCIsIGh0bWxBcnJheVtpXSk7XG4gICAgICByb3cucHVzaCh0ZCk7XG4gICAgICBpICs9IDE7XG4gICAgfVxuXG4gICAgcm93LmZvckVhY2goKGVsZW1lbnQpID0+IHtcbiAgICAgIHRyLmluc2VydEFkamFjZW50RWxlbWVudChcImJlZm9yZWVuZFwiLCBlbGVtZW50KTtcbiAgICB9KTtcblxuICAgIGdyaWQucHVzaCh0cik7XG4gIH1cblxuICByZXR1cm4gZ3JpZDtcbn07XG5cbmNvbnN0IGNyZWF0ZVRhYmxlQm9keSA9IChncmlkKSA9PiB7XG4gIGNvbnN0IHRhYmxlQm9keSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJ0Ym9keVwiKTtcbiAgZ3JpZC5mb3JFYWNoKChlbGVtZW50KSA9PiB7XG4gICAgdGFibGVCb2R5Lmluc2VydEFkamFjZW50RWxlbWVudChcImJlZm9yZWVuZFwiLCBlbGVtZW50KTtcbiAgfSk7XG5cbiAgcmV0dXJuIHRhYmxlQm9keTtcbn07XG5cbi8qKlxuICogc2V0IHRoZSB2YWx1ZSBvZiB0aGUgZWxlbWVudCBhbmQgZGlzcGF0Y2ggYSBjaGFuZ2UgZXZlbnRcbiAqXG4gKiBAcGFyYW0ge0hUTUxJbnB1dEVsZW1lbnR9IGVsIFRoZSBlbGVtZW50IHRvIHVwZGF0ZVxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIFRoZSBuZXcgdmFsdWUgb2YgdGhlIGVsZW1lbnRcbiAqL1xuY29uc3QgY2hhbmdlRWxlbWVudFZhbHVlID0gKGVsLCB2YWx1ZSA9IFwiXCIpID0+IHtcbiAgY29uc3QgZWxlbWVudFRvQ2hhbmdlID0gZWw7XG4gIGVsZW1lbnRUb0NoYW5nZS52YWx1ZSA9IHZhbHVlO1xuXG4gIGNvbnN0IGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KFwiY2hhbmdlXCIsIHtcbiAgICBidWJibGVzOiB0cnVlLFxuICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgZGV0YWlsOiB7IHZhbHVlIH0sXG4gIH0pO1xuICBlbGVtZW50VG9DaGFuZ2UuZGlzcGF0Y2hFdmVudChldmVudCk7XG59O1xuXG4vKipcbiAqIFRoZSBwcm9wZXJ0aWVzIGFuZCBlbGVtZW50cyB3aXRoaW4gdGhlIGRhdGUgcGlja2VyLlxuICogQHR5cGVkZWYge09iamVjdH0gRGF0ZVBpY2tlckNvbnRleHRcbiAqIEBwcm9wZXJ0eSB7SFRNTERpdkVsZW1lbnR9IGNhbGVuZGFyRWxcbiAqIEBwcm9wZXJ0eSB7SFRNTEVsZW1lbnR9IGRhdGVQaWNrZXJFbFxuICogQHByb3BlcnR5IHtIVE1MSW5wdXRFbGVtZW50fSBpbnRlcm5hbElucHV0RWxcbiAqIEBwcm9wZXJ0eSB7SFRNTElucHV0RWxlbWVudH0gZXh0ZXJuYWxJbnB1dEVsXG4gKiBAcHJvcGVydHkge0hUTUxEaXZFbGVtZW50fSBzdGF0dXNFbFxuICogQHByb3BlcnR5IHtIVE1MRGl2RWxlbWVudH0gZmlyc3RZZWFyQ2h1bmtFbFxuICogQHByb3BlcnR5IHtEYXRlfSBjYWxlbmRhckRhdGVcbiAqIEBwcm9wZXJ0eSB7RGF0ZX0gbWluRGF0ZVxuICogQHByb3BlcnR5IHtEYXRlfSBtYXhEYXRlXG4gKiBAcHJvcGVydHkge0RhdGV9IHNlbGVjdGVkRGF0ZVxuICogQHByb3BlcnR5IHtEYXRlfSByYW5nZURhdGVcbiAqIEBwcm9wZXJ0eSB7RGF0ZX0gZGVmYXVsdERhdGVcbiAqL1xuXG4vKipcbiAqIEdldCBhbiBvYmplY3Qgb2YgdGhlIHByb3BlcnRpZXMgYW5kIGVsZW1lbnRzIGJlbG9uZ2luZyBkaXJlY3RseSB0byB0aGUgZ2l2ZW5cbiAqIGRhdGUgcGlja2VyIGNvbXBvbmVudC5cbiAqXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbCB0aGUgZWxlbWVudCB3aXRoaW4gdGhlIGRhdGUgcGlja2VyXG4gKiBAcmV0dXJucyB7RGF0ZVBpY2tlckNvbnRleHR9IGVsZW1lbnRzXG4gKi9cbmNvbnN0IGdldERhdGVQaWNrZXJDb250ZXh0ID0gKGVsKSA9PiB7XG4gIGNvbnN0IGRhdGVQaWNrZXJFbCA9IGVsLmNsb3Nlc3QoREFURV9QSUNLRVIpO1xuXG4gIGlmICghZGF0ZVBpY2tlckVsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBFbGVtZW50IGlzIG1pc3Npbmcgb3V0ZXIgJHtEQVRFX1BJQ0tFUn1gKTtcbiAgfVxuXG4gIGNvbnN0IGludGVybmFsSW5wdXRFbCA9IGRhdGVQaWNrZXJFbC5xdWVyeVNlbGVjdG9yKFxuICAgIERBVEVfUElDS0VSX0lOVEVSTkFMX0lOUFVUXG4gICk7XG4gIGNvbnN0IGV4dGVybmFsSW5wdXRFbCA9IGRhdGVQaWNrZXJFbC5xdWVyeVNlbGVjdG9yKFxuICAgIERBVEVfUElDS0VSX0VYVEVSTkFMX0lOUFVUXG4gICk7XG4gIGNvbnN0IGNhbGVuZGFyRWwgPSBkYXRlUGlja2VyRWwucXVlcnlTZWxlY3RvcihEQVRFX1BJQ0tFUl9DQUxFTkRBUik7XG4gIGNvbnN0IHRvZ2dsZUJ0bkVsID0gZGF0ZVBpY2tlckVsLnF1ZXJ5U2VsZWN0b3IoREFURV9QSUNLRVJfQlVUVE9OKTtcbiAgY29uc3Qgc3RhdHVzRWwgPSBkYXRlUGlja2VyRWwucXVlcnlTZWxlY3RvcihEQVRFX1BJQ0tFUl9TVEFUVVMpO1xuICBjb25zdCBmaXJzdFllYXJDaHVua0VsID0gZGF0ZVBpY2tlckVsLnF1ZXJ5U2VsZWN0b3IoQ0FMRU5EQVJfWUVBUik7XG5cbiAgY29uc3QgaW5wdXREYXRlID0gcGFyc2VEYXRlU3RyaW5nKFxuICAgIGV4dGVybmFsSW5wdXRFbC52YWx1ZSxcbiAgICBERUZBVUxUX0VYVEVSTkFMX0RBVEVfRk9STUFULFxuICAgIHRydWVcbiAgKTtcbiAgY29uc3Qgc2VsZWN0ZWREYXRlID0gcGFyc2VEYXRlU3RyaW5nKGludGVybmFsSW5wdXRFbC52YWx1ZSk7XG5cbiAgY29uc3QgY2FsZW5kYXJEYXRlID0gcGFyc2VEYXRlU3RyaW5nKGNhbGVuZGFyRWwuZGF0YXNldC52YWx1ZSk7XG4gIGNvbnN0IG1pbkRhdGUgPSBwYXJzZURhdGVTdHJpbmcoZGF0ZVBpY2tlckVsLmRhdGFzZXQubWluRGF0ZSk7XG4gIGNvbnN0IG1heERhdGUgPSBwYXJzZURhdGVTdHJpbmcoZGF0ZVBpY2tlckVsLmRhdGFzZXQubWF4RGF0ZSk7XG4gIGNvbnN0IHJhbmdlRGF0ZSA9IHBhcnNlRGF0ZVN0cmluZyhkYXRlUGlja2VyRWwuZGF0YXNldC5yYW5nZURhdGUpO1xuICBjb25zdCBkZWZhdWx0RGF0ZSA9IHBhcnNlRGF0ZVN0cmluZyhkYXRlUGlja2VyRWwuZGF0YXNldC5kZWZhdWx0RGF0ZSk7XG5cbiAgaWYgKG1pbkRhdGUgJiYgbWF4RGF0ZSAmJiBtaW5EYXRlID4gbWF4RGF0ZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk1pbmltdW0gZGF0ZSBjYW5ub3QgYmUgYWZ0ZXIgbWF4aW11bSBkYXRlXCIpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBjYWxlbmRhckRhdGUsXG4gICAgbWluRGF0ZSxcbiAgICB0b2dnbGVCdG5FbCxcbiAgICBzZWxlY3RlZERhdGUsXG4gICAgbWF4RGF0ZSxcbiAgICBmaXJzdFllYXJDaHVua0VsLFxuICAgIGRhdGVQaWNrZXJFbCxcbiAgICBpbnB1dERhdGUsXG4gICAgaW50ZXJuYWxJbnB1dEVsLFxuICAgIGV4dGVybmFsSW5wdXRFbCxcbiAgICBjYWxlbmRhckVsLFxuICAgIHJhbmdlRGF0ZSxcbiAgICBkZWZhdWx0RGF0ZSxcbiAgICBzdGF0dXNFbCxcbiAgfTtcbn07XG5cbi8qKlxuICogRGlzYWJsZSB0aGUgZGF0ZSBwaWNrZXIgY29tcG9uZW50XG4gKlxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWwgQW4gZWxlbWVudCB3aXRoaW4gdGhlIGRhdGUgcGlja2VyIGNvbXBvbmVudFxuICovXG5jb25zdCBkaXNhYmxlID0gKGVsKSA9PiB7XG4gIGNvbnN0IHsgZXh0ZXJuYWxJbnB1dEVsLCB0b2dnbGVCdG5FbCB9ID0gZ2V0RGF0ZVBpY2tlckNvbnRleHQoZWwpO1xuXG4gIHRvZ2dsZUJ0bkVsLmRpc2FibGVkID0gdHJ1ZTtcbiAgZXh0ZXJuYWxJbnB1dEVsLmRpc2FibGVkID0gdHJ1ZTtcbn07XG5cbi8qKlxuICogQ2hlY2sgZm9yIGFyaWEtZGlzYWJsZWQgb24gaW5pdGlhbGl6YXRpb25cbiAqXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbCBBbiBlbGVtZW50IHdpdGhpbiB0aGUgZGF0ZSBwaWNrZXIgY29tcG9uZW50XG4gKi9cbmNvbnN0IGFyaWFEaXNhYmxlID0gKGVsKSA9PiB7XG4gIGNvbnN0IHsgZXh0ZXJuYWxJbnB1dEVsLCB0b2dnbGVCdG5FbCB9ID0gZ2V0RGF0ZVBpY2tlckNvbnRleHQoZWwpO1xuXG4gIHRvZ2dsZUJ0bkVsLnNldEF0dHJpYnV0ZShcImFyaWEtZGlzYWJsZWRcIiwgdHJ1ZSk7XG4gIGV4dGVybmFsSW5wdXRFbC5zZXRBdHRyaWJ1dGUoXCJhcmlhLWRpc2FibGVkXCIsIHRydWUpO1xufTtcblxuLyoqXG4gKiBFbmFibGUgdGhlIGRhdGUgcGlja2VyIGNvbXBvbmVudFxuICpcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsIEFuIGVsZW1lbnQgd2l0aGluIHRoZSBkYXRlIHBpY2tlciBjb21wb25lbnRcbiAqL1xuY29uc3QgZW5hYmxlID0gKGVsKSA9PiB7XG4gIGNvbnN0IHsgZXh0ZXJuYWxJbnB1dEVsLCB0b2dnbGVCdG5FbCB9ID0gZ2V0RGF0ZVBpY2tlckNvbnRleHQoZWwpO1xuXG4gIHRvZ2dsZUJ0bkVsLmRpc2FibGVkID0gZmFsc2U7XG4gIGV4dGVybmFsSW5wdXRFbC5kaXNhYmxlZCA9IGZhbHNlO1xufTtcblxuLy8gI3JlZ2lvbiBWYWxpZGF0aW9uXG5cbi8qKlxuICogVmFsaWRhdGUgdGhlIHZhbHVlIGluIHRoZSBpbnB1dCBhcyBhIHZhbGlkIGRhdGUgb2YgZm9ybWF0IE0vRC9ZWVlZXG4gKlxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWwgQW4gZWxlbWVudCB3aXRoaW4gdGhlIGRhdGUgcGlja2VyIGNvbXBvbmVudFxuICovXG5jb25zdCBpc0RhdGVJbnB1dEludmFsaWQgPSAoZWwpID0+IHtcbiAgY29uc3QgeyBleHRlcm5hbElucHV0RWwsIG1pbkRhdGUsIG1heERhdGUgfSA9IGdldERhdGVQaWNrZXJDb250ZXh0KGVsKTtcblxuICBjb25zdCBkYXRlU3RyaW5nID0gZXh0ZXJuYWxJbnB1dEVsLnZhbHVlO1xuICBsZXQgaXNJbnZhbGlkID0gZmFsc2U7XG5cbiAgaWYgKGRhdGVTdHJpbmcpIHtcbiAgICBpc0ludmFsaWQgPSB0cnVlO1xuXG4gICAgY29uc3QgZGF0ZVN0cmluZ1BhcnRzID0gZGF0ZVN0cmluZy5zcGxpdChcIi9cIik7XG4gICAgY29uc3QgW21vbnRoLCBkYXksIHllYXJdID0gZGF0ZVN0cmluZ1BhcnRzLm1hcCgoc3RyKSA9PiB7XG4gICAgICBsZXQgdmFsdWU7XG4gICAgICBjb25zdCBwYXJzZWQgPSBwYXJzZUludChzdHIsIDEwKTtcbiAgICAgIGlmICghTnVtYmVyLmlzTmFOKHBhcnNlZCkpIHZhbHVlID0gcGFyc2VkO1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH0pO1xuXG4gICAgaWYgKG1vbnRoICYmIGRheSAmJiB5ZWFyICE9IG51bGwpIHtcbiAgICAgIGNvbnN0IGNoZWNrRGF0ZSA9IHNldERhdGUoeWVhciwgbW9udGggLSAxLCBkYXkpO1xuXG4gICAgICBpZiAoXG4gICAgICAgIGNoZWNrRGF0ZS5nZXRNb250aCgpID09PSBtb250aCAtIDEgJiZcbiAgICAgICAgY2hlY2tEYXRlLmdldERhdGUoKSA9PT0gZGF5ICYmXG4gICAgICAgIGNoZWNrRGF0ZS5nZXRGdWxsWWVhcigpID09PSB5ZWFyICYmXG4gICAgICAgIGRhdGVTdHJpbmdQYXJ0c1syXS5sZW5ndGggPT09IDQgJiZcbiAgICAgICAgaXNEYXRlV2l0aGluTWluQW5kTWF4KGNoZWNrRGF0ZSwgbWluRGF0ZSwgbWF4RGF0ZSlcbiAgICAgICkge1xuICAgICAgICBpc0ludmFsaWQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gaXNJbnZhbGlkO1xufTtcblxuLyoqXG4gKiBWYWxpZGF0ZSB0aGUgdmFsdWUgaW4gdGhlIGlucHV0IGFzIGEgdmFsaWQgZGF0ZSBvZiBmb3JtYXQgTS9EL1lZWVlcbiAqXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbCBBbiBlbGVtZW50IHdpdGhpbiB0aGUgZGF0ZSBwaWNrZXIgY29tcG9uZW50XG4gKi9cbmNvbnN0IHZhbGlkYXRlRGF0ZUlucHV0ID0gKGVsKSA9PiB7XG4gIGNvbnN0IHsgZXh0ZXJuYWxJbnB1dEVsIH0gPSBnZXREYXRlUGlja2VyQ29udGV4dChlbCk7XG4gIGNvbnN0IGlzSW52YWxpZCA9IGlzRGF0ZUlucHV0SW52YWxpZChleHRlcm5hbElucHV0RWwpO1xuXG4gIGlmIChpc0ludmFsaWQgJiYgIWV4dGVybmFsSW5wdXRFbC52YWxpZGF0aW9uTWVzc2FnZSkge1xuICAgIGV4dGVybmFsSW5wdXRFbC5zZXRDdXN0b21WYWxpZGl0eShWQUxJREFUSU9OX01FU1NBR0UpO1xuICB9XG5cbiAgaWYgKCFpc0ludmFsaWQgJiYgZXh0ZXJuYWxJbnB1dEVsLnZhbGlkYXRpb25NZXNzYWdlID09PSBWQUxJREFUSU9OX01FU1NBR0UpIHtcbiAgICBleHRlcm5hbElucHV0RWwuc2V0Q3VzdG9tVmFsaWRpdHkoXCJcIik7XG4gIH1cbn07XG5cbi8vICNlbmRyZWdpb24gVmFsaWRhdGlvblxuXG4vKipcbiAqIEVuYWJsZSB0aGUgZGF0ZSBwaWNrZXIgY29tcG9uZW50XG4gKlxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWwgQW4gZWxlbWVudCB3aXRoaW4gdGhlIGRhdGUgcGlja2VyIGNvbXBvbmVudFxuICovXG5jb25zdCByZWNvbmNpbGVJbnB1dFZhbHVlcyA9IChlbCkgPT4ge1xuICBjb25zdCB7IGludGVybmFsSW5wdXRFbCwgaW5wdXREYXRlIH0gPSBnZXREYXRlUGlja2VyQ29udGV4dChlbCk7XG4gIGxldCBuZXdWYWx1ZSA9IFwiXCI7XG5cbiAgaWYgKGlucHV0RGF0ZSAmJiAhaXNEYXRlSW5wdXRJbnZhbGlkKGVsKSkge1xuICAgIG5ld1ZhbHVlID0gZm9ybWF0RGF0ZShpbnB1dERhdGUpO1xuICB9XG5cbiAgaWYgKGludGVybmFsSW5wdXRFbC52YWx1ZSAhPT0gbmV3VmFsdWUpIHtcbiAgICBjaGFuZ2VFbGVtZW50VmFsdWUoaW50ZXJuYWxJbnB1dEVsLCBuZXdWYWx1ZSk7XG4gIH1cbn07XG5cbi8qKlxuICogU2VsZWN0IHRoZSB2YWx1ZSBvZiB0aGUgZGF0ZSBwaWNrZXIgaW5wdXRzLlxuICpcbiAqIEBwYXJhbSB7SFRNTEJ1dHRvbkVsZW1lbnR9IGVsIEFuIGVsZW1lbnQgd2l0aGluIHRoZSBkYXRlIHBpY2tlciBjb21wb25lbnRcbiAqIEBwYXJhbSB7c3RyaW5nfSBkYXRlU3RyaW5nIFRoZSBkYXRlIHN0cmluZyB0byB1cGRhdGUgaW4gWVlZWS1NTS1ERCBmb3JtYXRcbiAqL1xuY29uc3Qgc2V0Q2FsZW5kYXJWYWx1ZSA9IChlbCwgZGF0ZVN0cmluZykgPT4ge1xuICBjb25zdCBwYXJzZWREYXRlID0gcGFyc2VEYXRlU3RyaW5nKGRhdGVTdHJpbmcpO1xuXG4gIGlmIChwYXJzZWREYXRlKSB7XG4gICAgY29uc3QgZm9ybWF0dGVkRGF0ZSA9IGZvcm1hdERhdGUocGFyc2VkRGF0ZSwgREVGQVVMVF9FWFRFUk5BTF9EQVRFX0ZPUk1BVCk7XG5cbiAgICBjb25zdCB7IGRhdGVQaWNrZXJFbCwgaW50ZXJuYWxJbnB1dEVsLCBleHRlcm5hbElucHV0RWwgfSA9XG4gICAgICBnZXREYXRlUGlja2VyQ29udGV4dChlbCk7XG5cbiAgICBjaGFuZ2VFbGVtZW50VmFsdWUoaW50ZXJuYWxJbnB1dEVsLCBkYXRlU3RyaW5nKTtcbiAgICBjaGFuZ2VFbGVtZW50VmFsdWUoZXh0ZXJuYWxJbnB1dEVsLCBmb3JtYXR0ZWREYXRlKTtcblxuICAgIHZhbGlkYXRlRGF0ZUlucHV0KGRhdGVQaWNrZXJFbCk7XG4gIH1cbn07XG5cbi8qKlxuICogRW5oYW5jZSBhbiBpbnB1dCB3aXRoIHRoZSBkYXRlIHBpY2tlciBlbGVtZW50c1xuICpcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsIFRoZSBpbml0aWFsIHdyYXBwaW5nIGVsZW1lbnQgb2YgdGhlIGRhdGUgcGlja2VyIGNvbXBvbmVudFxuICovXG5jb25zdCBlbmhhbmNlRGF0ZVBpY2tlciA9IChlbCkgPT4ge1xuICBjb25zdCBkYXRlUGlja2VyRWwgPSBlbC5jbG9zZXN0KERBVEVfUElDS0VSKTtcbiAgY29uc3QgeyBkZWZhdWx0VmFsdWUgfSA9IGRhdGVQaWNrZXJFbC5kYXRhc2V0O1xuXG4gIGNvbnN0IGludGVybmFsSW5wdXRFbCA9IGRhdGVQaWNrZXJFbC5xdWVyeVNlbGVjdG9yKGBpbnB1dGApO1xuXG4gIGlmICghaW50ZXJuYWxJbnB1dEVsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGAke0RBVEVfUElDS0VSfSBpcyBtaXNzaW5nIGlubmVyIGlucHV0YCk7XG4gIH1cblxuICBpZiAoaW50ZXJuYWxJbnB1dEVsLnZhbHVlKSB7XG4gICAgaW50ZXJuYWxJbnB1dEVsLnZhbHVlID0gXCJcIjtcbiAgfVxuXG4gIGNvbnN0IG1pbkRhdGUgPSBwYXJzZURhdGVTdHJpbmcoXG4gICAgZGF0ZVBpY2tlckVsLmRhdGFzZXQubWluRGF0ZSB8fCBpbnRlcm5hbElucHV0RWwuZ2V0QXR0cmlidXRlKFwibWluXCIpXG4gICk7XG4gIGRhdGVQaWNrZXJFbC5kYXRhc2V0Lm1pbkRhdGUgPSBtaW5EYXRlXG4gICAgPyBmb3JtYXREYXRlKG1pbkRhdGUpXG4gICAgOiBERUZBVUxUX01JTl9EQVRFO1xuXG4gIGNvbnN0IG1heERhdGUgPSBwYXJzZURhdGVTdHJpbmcoXG4gICAgZGF0ZVBpY2tlckVsLmRhdGFzZXQubWF4RGF0ZSB8fCBpbnRlcm5hbElucHV0RWwuZ2V0QXR0cmlidXRlKFwibWF4XCIpXG4gICk7XG4gIGlmIChtYXhEYXRlKSB7XG4gICAgZGF0ZVBpY2tlckVsLmRhdGFzZXQubWF4RGF0ZSA9IGZvcm1hdERhdGUobWF4RGF0ZSk7XG4gIH1cblxuICBjb25zdCBjYWxlbmRhcldyYXBwZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICBjYWxlbmRhcldyYXBwZXIuY2xhc3NMaXN0LmFkZChEQVRFX1BJQ0tFUl9XUkFQUEVSX0NMQVNTKTtcblxuICBjb25zdCBleHRlcm5hbElucHV0RWwgPSBpbnRlcm5hbElucHV0RWwuY2xvbmVOb2RlKCk7XG4gIGV4dGVybmFsSW5wdXRFbC5jbGFzc0xpc3QuYWRkKERBVEVfUElDS0VSX0VYVEVSTkFMX0lOUFVUX0NMQVNTKTtcbiAgZXh0ZXJuYWxJbnB1dEVsLnR5cGUgPSBcInRleHRcIjtcblxuICBjYWxlbmRhcldyYXBwZXIuYXBwZW5kQ2hpbGQoZXh0ZXJuYWxJbnB1dEVsKTtcbiAgY2FsZW5kYXJXcmFwcGVyLmluc2VydEFkamFjZW50SFRNTChcbiAgICBcImJlZm9yZWVuZFwiLFxuICAgIFNhbml0aXplci5lc2NhcGVIVE1MYFxuICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiJHtEQVRFX1BJQ0tFUl9CVVRUT05fQ0xBU1N9XCIgYXJpYS1oYXNwb3B1cD1cInRydWVcIiBhcmlhLWxhYmVsPVwiVG9nZ2xlIGNhbGVuZGFyXCI+PC9idXR0b24+XG4gICAgPGRpdiBjbGFzcz1cIiR7REFURV9QSUNLRVJfQ0FMRU5EQVJfQ0xBU1N9XCIgcm9sZT1cImFwcGxpY2F0aW9uXCIgaGlkZGVuPjwvZGl2PlxuICAgIDxkaXYgY2xhc3M9XCJ1c2Etc3Itb25seSAke0RBVEVfUElDS0VSX1NUQVRVU19DTEFTU31cIiByb2xlPVwic3RhdHVzXCIgYXJpYS1saXZlPVwicG9saXRlXCI+PC9kaXY+YFxuICApO1xuXG4gIGludGVybmFsSW5wdXRFbC5zZXRBdHRyaWJ1dGUoXCJhcmlhLWhpZGRlblwiLCBcInRydWVcIik7XG4gIGludGVybmFsSW5wdXRFbC5zZXRBdHRyaWJ1dGUoXCJ0YWJpbmRleFwiLCBcIi0xXCIpO1xuICBpbnRlcm5hbElucHV0RWwuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICBpbnRlcm5hbElucHV0RWwuY2xhc3NMaXN0LmFkZChEQVRFX1BJQ0tFUl9JTlRFUk5BTF9JTlBVVF9DTEFTUyk7XG4gIGludGVybmFsSW5wdXRFbC5yZW1vdmVBdHRyaWJ1dGUoXCJpZFwiKTtcbiAgaW50ZXJuYWxJbnB1dEVsLnJlbW92ZUF0dHJpYnV0ZShcIm5hbWVcIik7XG4gIGludGVybmFsSW5wdXRFbC5yZXF1aXJlZCA9IGZhbHNlO1xuXG4gIGRhdGVQaWNrZXJFbC5hcHBlbmRDaGlsZChjYWxlbmRhcldyYXBwZXIpO1xuICBkYXRlUGlja2VyRWwuY2xhc3NMaXN0LmFkZChEQVRFX1BJQ0tFUl9JTklUSUFMSVpFRF9DTEFTUyk7XG5cbiAgaWYgKGRlZmF1bHRWYWx1ZSkge1xuICAgIHNldENhbGVuZGFyVmFsdWUoZGF0ZVBpY2tlckVsLCBkZWZhdWx0VmFsdWUpO1xuICB9XG5cbiAgaWYgKGludGVybmFsSW5wdXRFbC5kaXNhYmxlZCkge1xuICAgIGRpc2FibGUoZGF0ZVBpY2tlckVsKTtcbiAgICBpbnRlcm5hbElucHV0RWwuZGlzYWJsZWQgPSBmYWxzZTtcbiAgfVxuXG4gIGlmIChpbnRlcm5hbElucHV0RWwuaGFzQXR0cmlidXRlKFwiYXJpYS1kaXNhYmxlZFwiKSkge1xuICAgIGFyaWFEaXNhYmxlKGRhdGVQaWNrZXJFbCk7XG4gICAgaW50ZXJuYWxJbnB1dEVsLnJlbW92ZUF0dHJpYnV0ZShcImFyaWEtZGlzYWJsZWRcIik7XG4gIH1cbn07XG5cbi8vICNyZWdpb24gQ2FsZW5kYXIgLSBEYXRlIFNlbGVjdGlvbiBWaWV3XG5cbi8qKlxuICogcmVuZGVyIHRoZSBjYWxlbmRhci5cbiAqXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbCBBbiBlbGVtZW50IHdpdGhpbiB0aGUgZGF0ZSBwaWNrZXIgY29tcG9uZW50XG4gKiBAcGFyYW0ge0RhdGV9IF9kYXRlVG9EaXNwbGF5IGEgZGF0ZSB0byByZW5kZXIgb24gdGhlIGNhbGVuZGFyXG4gKiBAcmV0dXJucyB7SFRNTEVsZW1lbnR9IGEgcmVmZXJlbmNlIHRvIHRoZSBuZXcgY2FsZW5kYXIgZWxlbWVudFxuICovXG5jb25zdCByZW5kZXJDYWxlbmRhciA9IChlbCwgX2RhdGVUb0Rpc3BsYXkpID0+IHtcbiAgY29uc3Qge1xuICAgIGRhdGVQaWNrZXJFbCxcbiAgICBjYWxlbmRhckVsLFxuICAgIHN0YXR1c0VsLFxuICAgIHNlbGVjdGVkRGF0ZSxcbiAgICBtYXhEYXRlLFxuICAgIG1pbkRhdGUsXG4gICAgcmFuZ2VEYXRlLFxuICB9ID0gZ2V0RGF0ZVBpY2tlckNvbnRleHQoZWwpO1xuICBjb25zdCB0b2RheXNEYXRlID0gdG9kYXkoKTtcbiAgbGV0IGRhdGVUb0Rpc3BsYXkgPSBfZGF0ZVRvRGlzcGxheSB8fCB0b2RheXNEYXRlO1xuXG4gIGNvbnN0IGNhbGVuZGFyV2FzSGlkZGVuID0gY2FsZW5kYXJFbC5oaWRkZW47XG5cbiAgY29uc3QgZm9jdXNlZERhdGUgPSBhZGREYXlzKGRhdGVUb0Rpc3BsYXksIDApO1xuICBjb25zdCBmb2N1c2VkTW9udGggPSBkYXRlVG9EaXNwbGF5LmdldE1vbnRoKCk7XG4gIGNvbnN0IGZvY3VzZWRZZWFyID0gZGF0ZVRvRGlzcGxheS5nZXRGdWxsWWVhcigpO1xuXG4gIGNvbnN0IHByZXZNb250aCA9IHN1Yk1vbnRocyhkYXRlVG9EaXNwbGF5LCAxKTtcbiAgY29uc3QgbmV4dE1vbnRoID0gYWRkTW9udGhzKGRhdGVUb0Rpc3BsYXksIDEpO1xuXG4gIGNvbnN0IGN1cnJlbnRGb3JtYXR0ZWREYXRlID0gZm9ybWF0RGF0ZShkYXRlVG9EaXNwbGF5KTtcblxuICBjb25zdCBmaXJzdE9mTW9udGggPSBzdGFydE9mTW9udGgoZGF0ZVRvRGlzcGxheSk7XG4gIGNvbnN0IHByZXZCdXR0b25zRGlzYWJsZWQgPSBpc1NhbWVNb250aChkYXRlVG9EaXNwbGF5LCBtaW5EYXRlKTtcbiAgY29uc3QgbmV4dEJ1dHRvbnNEaXNhYmxlZCA9IGlzU2FtZU1vbnRoKGRhdGVUb0Rpc3BsYXksIG1heERhdGUpO1xuXG4gIGNvbnN0IHJhbmdlQ29uY2x1c2lvbkRhdGUgPSBzZWxlY3RlZERhdGUgfHwgZGF0ZVRvRGlzcGxheTtcbiAgY29uc3QgcmFuZ2VTdGFydERhdGUgPSByYW5nZURhdGUgJiYgbWluKHJhbmdlQ29uY2x1c2lvbkRhdGUsIHJhbmdlRGF0ZSk7XG4gIGNvbnN0IHJhbmdlRW5kRGF0ZSA9IHJhbmdlRGF0ZSAmJiBtYXgocmFuZ2VDb25jbHVzaW9uRGF0ZSwgcmFuZ2VEYXRlKTtcblxuICBjb25zdCB3aXRoaW5SYW5nZVN0YXJ0RGF0ZSA9IHJhbmdlRGF0ZSAmJiBhZGREYXlzKHJhbmdlU3RhcnREYXRlLCAxKTtcbiAgY29uc3Qgd2l0aGluUmFuZ2VFbmREYXRlID0gcmFuZ2VEYXRlICYmIHN1YkRheXMocmFuZ2VFbmREYXRlLCAxKTtcblxuICBjb25zdCBtb250aExhYmVsID0gTU9OVEhfTEFCRUxTW2ZvY3VzZWRNb250aF07XG5cbiAgY29uc3QgZ2VuZXJhdGVEYXRlSHRtbCA9IChkYXRlVG9SZW5kZXIpID0+IHtcbiAgICBjb25zdCBjbGFzc2VzID0gW0NBTEVOREFSX0RBVEVfQ0xBU1NdO1xuICAgIGNvbnN0IGRheSA9IGRhdGVUb1JlbmRlci5nZXREYXRlKCk7XG4gICAgY29uc3QgbW9udGggPSBkYXRlVG9SZW5kZXIuZ2V0TW9udGgoKTtcbiAgICBjb25zdCB5ZWFyID0gZGF0ZVRvUmVuZGVyLmdldEZ1bGxZZWFyKCk7XG4gICAgY29uc3QgZGF5T2ZXZWVrID0gZGF0ZVRvUmVuZGVyLmdldERheSgpO1xuXG4gICAgY29uc3QgZm9ybWF0dGVkRGF0ZSA9IGZvcm1hdERhdGUoZGF0ZVRvUmVuZGVyKTtcblxuICAgIGxldCB0YWJpbmRleCA9IFwiLTFcIjtcblxuICAgIGNvbnN0IGlzRGlzYWJsZWQgPSAhaXNEYXRlV2l0aGluTWluQW5kTWF4KGRhdGVUb1JlbmRlciwgbWluRGF0ZSwgbWF4RGF0ZSk7XG4gICAgY29uc3QgaXNTZWxlY3RlZCA9IGlzU2FtZURheShkYXRlVG9SZW5kZXIsIHNlbGVjdGVkRGF0ZSk7XG5cbiAgICBpZiAoaXNTYW1lTW9udGgoZGF0ZVRvUmVuZGVyLCBwcmV2TW9udGgpKSB7XG4gICAgICBjbGFzc2VzLnB1c2goQ0FMRU5EQVJfREFURV9QUkVWSU9VU19NT05USF9DTEFTUyk7XG4gICAgfVxuXG4gICAgaWYgKGlzU2FtZU1vbnRoKGRhdGVUb1JlbmRlciwgZm9jdXNlZERhdGUpKSB7XG4gICAgICBjbGFzc2VzLnB1c2goQ0FMRU5EQVJfREFURV9DVVJSRU5UX01PTlRIX0NMQVNTKTtcbiAgICB9XG5cbiAgICBpZiAoaXNTYW1lTW9udGgoZGF0ZVRvUmVuZGVyLCBuZXh0TW9udGgpKSB7XG4gICAgICBjbGFzc2VzLnB1c2goQ0FMRU5EQVJfREFURV9ORVhUX01PTlRIX0NMQVNTKTtcbiAgICB9XG5cbiAgICBpZiAoaXNTZWxlY3RlZCkge1xuICAgICAgY2xhc3Nlcy5wdXNoKENBTEVOREFSX0RBVEVfU0VMRUNURURfQ0xBU1MpO1xuICAgIH1cblxuICAgIGlmIChpc1NhbWVEYXkoZGF0ZVRvUmVuZGVyLCB0b2RheXNEYXRlKSkge1xuICAgICAgY2xhc3Nlcy5wdXNoKENBTEVOREFSX0RBVEVfVE9EQVlfQ0xBU1MpO1xuICAgIH1cblxuICAgIGlmIChyYW5nZURhdGUpIHtcbiAgICAgIGlmIChpc1NhbWVEYXkoZGF0ZVRvUmVuZGVyLCByYW5nZURhdGUpKSB7XG4gICAgICAgIGNsYXNzZXMucHVzaChDQUxFTkRBUl9EQVRFX1JBTkdFX0RBVEVfQ0xBU1MpO1xuICAgICAgfVxuXG4gICAgICBpZiAoaXNTYW1lRGF5KGRhdGVUb1JlbmRlciwgcmFuZ2VTdGFydERhdGUpKSB7XG4gICAgICAgIGNsYXNzZXMucHVzaChDQUxFTkRBUl9EQVRFX1JBTkdFX0RBVEVfU1RBUlRfQ0xBU1MpO1xuICAgICAgfVxuXG4gICAgICBpZiAoaXNTYW1lRGF5KGRhdGVUb1JlbmRlciwgcmFuZ2VFbmREYXRlKSkge1xuICAgICAgICBjbGFzc2VzLnB1c2goQ0FMRU5EQVJfREFURV9SQU5HRV9EQVRFX0VORF9DTEFTUyk7XG4gICAgICB9XG5cbiAgICAgIGlmIChcbiAgICAgICAgaXNEYXRlV2l0aGluTWluQW5kTWF4KFxuICAgICAgICAgIGRhdGVUb1JlbmRlcixcbiAgICAgICAgICB3aXRoaW5SYW5nZVN0YXJ0RGF0ZSxcbiAgICAgICAgICB3aXRoaW5SYW5nZUVuZERhdGVcbiAgICAgICAgKVxuICAgICAgKSB7XG4gICAgICAgIGNsYXNzZXMucHVzaChDQUxFTkRBUl9EQVRFX1dJVEhJTl9SQU5HRV9DTEFTUyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGlzU2FtZURheShkYXRlVG9SZW5kZXIsIGZvY3VzZWREYXRlKSkge1xuICAgICAgdGFiaW5kZXggPSBcIjBcIjtcbiAgICAgIGNsYXNzZXMucHVzaChDQUxFTkRBUl9EQVRFX0ZPQ1VTRURfQ0xBU1MpO1xuICAgIH1cblxuICAgIGNvbnN0IG1vbnRoU3RyID0gTU9OVEhfTEFCRUxTW21vbnRoXTtcbiAgICBjb25zdCBkYXlTdHIgPSBEQVlfT0ZfV0VFS19MQUJFTFNbZGF5T2ZXZWVrXTtcblxuICAgIGNvbnN0IGJ0biA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJidXR0b25cIik7XG4gICAgYnRuLnNldEF0dHJpYnV0ZShcInR5cGVcIiwgXCJidXR0b25cIik7XG4gICAgYnRuLnNldEF0dHJpYnV0ZShcInRhYmluZGV4XCIsIHRhYmluZGV4KTtcbiAgICBidG4uc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgY2xhc3Nlcy5qb2luKFwiIFwiKSk7XG4gICAgYnRuLnNldEF0dHJpYnV0ZShcImRhdGEtZGF5XCIsIGRheSk7XG4gICAgYnRuLnNldEF0dHJpYnV0ZShcImRhdGEtbW9udGhcIiwgbW9udGggKyAxKTtcbiAgICBidG4uc2V0QXR0cmlidXRlKFwiZGF0YS15ZWFyXCIsIHllYXIpO1xuICAgIGJ0bi5zZXRBdHRyaWJ1dGUoXCJkYXRhLXZhbHVlXCIsIGZvcm1hdHRlZERhdGUpO1xuICAgIGJ0bi5zZXRBdHRyaWJ1dGUoXG4gICAgICBcImFyaWEtbGFiZWxcIixcbiAgICAgIFNhbml0aXplci5lc2NhcGVIVE1MYCR7ZGF5fSAke21vbnRoU3RyfSAke3llYXJ9ICR7ZGF5U3RyfWBcbiAgICApO1xuICAgIGJ0bi5zZXRBdHRyaWJ1dGUoXCJhcmlhLXNlbGVjdGVkXCIsIGlzU2VsZWN0ZWQgPyBcInRydWVcIiA6IFwiZmFsc2VcIik7XG4gICAgaWYgKGlzRGlzYWJsZWQgPT09IHRydWUpIHtcbiAgICAgIGJ0bi5kaXNhYmxlZCA9IHRydWU7XG4gICAgfVxuICAgIGJ0bi50ZXh0Q29udGVudCA9IGRheTtcblxuICAgIHJldHVybiBidG47XG4gIH07XG5cbiAgLy8gc2V0IGRhdGUgdG8gZmlyc3QgcmVuZGVyZWQgZGF5XG4gIGRhdGVUb0Rpc3BsYXkgPSBzdGFydE9mV2VlayhmaXJzdE9mTW9udGgpO1xuXG4gIGNvbnN0IGRheXMgPSBbXTtcblxuICB3aGlsZSAoXG4gICAgZGF5cy5sZW5ndGggPCAyOCB8fFxuICAgIGRhdGVUb0Rpc3BsYXkuZ2V0TW9udGgoKSA9PT0gZm9jdXNlZE1vbnRoIHx8XG4gICAgZGF5cy5sZW5ndGggJSA3ICE9PSAwXG4gICkge1xuICAgIGRheXMucHVzaChnZW5lcmF0ZURhdGVIdG1sKGRhdGVUb0Rpc3BsYXkpKTtcbiAgICBkYXRlVG9EaXNwbGF5ID0gYWRkRGF5cyhkYXRlVG9EaXNwbGF5LCAxKTtcbiAgfVxuXG4gIGNvbnN0IGRhdGVzR3JpZCA9IGxpc3RUb0dyaWRIdG1sKGRheXMsIDcpO1xuXG4gIGNvbnN0IG5ld0NhbGVuZGFyID0gY2FsZW5kYXJFbC5jbG9uZU5vZGUoKTtcbiAgbmV3Q2FsZW5kYXIuZGF0YXNldC52YWx1ZSA9IGN1cnJlbnRGb3JtYXR0ZWREYXRlO1xuICBuZXdDYWxlbmRhci5zdHlsZS50b3AgPSBgJHtkYXRlUGlja2VyRWwub2Zmc2V0SGVpZ2h0fXB4YDtcbiAgbmV3Q2FsZW5kYXIuaGlkZGVuID0gZmFsc2U7XG4gIG5ld0NhbGVuZGFyLmlubmVySFRNTCA9IFNhbml0aXplci5lc2NhcGVIVE1MYFxuICAgIDxkaXYgdGFiaW5kZXg9XCItMVwiIGNsYXNzPVwiJHtDQUxFTkRBUl9EQVRFX1BJQ0tFUl9DTEFTU31cIj5cbiAgICAgIDxkaXYgY2xhc3M9XCIke0NBTEVOREFSX1JPV19DTEFTU31cIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cIiR7Q0FMRU5EQVJfQ0VMTF9DTEFTU30gJHtDQUxFTkRBUl9DRUxMX0NFTlRFUl9JVEVNU19DTEFTU31cIj5cbiAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgIGNsYXNzPVwiJHtDQUxFTkRBUl9QUkVWSU9VU19ZRUFSX0NMQVNTfVwiXG4gICAgICAgICAgICBhcmlhLWxhYmVsPVwiTmF2aWdhdGUgYmFjayBvbmUgeWVhclwiXG4gICAgICAgICAgICAke3ByZXZCdXR0b25zRGlzYWJsZWQgPyBgZGlzYWJsZWQ9XCJkaXNhYmxlZFwiYCA6IFwiXCJ9XG4gICAgICAgICAgPjwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cIiR7Q0FMRU5EQVJfQ0VMTF9DTEFTU30gJHtDQUxFTkRBUl9DRUxMX0NFTlRFUl9JVEVNU19DTEFTU31cIj5cbiAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgIGNsYXNzPVwiJHtDQUxFTkRBUl9QUkVWSU9VU19NT05USF9DTEFTU31cIlxuICAgICAgICAgICAgYXJpYS1sYWJlbD1cIk5hdmlnYXRlIGJhY2sgb25lIG1vbnRoXCJcbiAgICAgICAgICAgICR7cHJldkJ1dHRvbnNEaXNhYmxlZCA/IGBkaXNhYmxlZD1cImRpc2FibGVkXCJgIDogXCJcIn1cbiAgICAgICAgICA+PC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwiJHtDQUxFTkRBUl9DRUxMX0NMQVNTfSAke0NBTEVOREFSX01PTlRIX0xBQkVMX0NMQVNTfVwiPlxuICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgY2xhc3M9XCIke0NBTEVOREFSX01PTlRIX1NFTEVDVElPTl9DTEFTU31cIiBhcmlhLWxhYmVsPVwiJHttb250aExhYmVsfS4gU2VsZWN0IG1vbnRoXCJcbiAgICAgICAgICA+JHttb250aExhYmVsfTwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgY2xhc3M9XCIke0NBTEVOREFSX1lFQVJfU0VMRUNUSU9OX0NMQVNTfVwiIGFyaWEtbGFiZWw9XCIke2ZvY3VzZWRZZWFyfS4gU2VsZWN0IHllYXJcIlxuICAgICAgICAgID4ke2ZvY3VzZWRZZWFyfTwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cIiR7Q0FMRU5EQVJfQ0VMTF9DTEFTU30gJHtDQUxFTkRBUl9DRUxMX0NFTlRFUl9JVEVNU19DTEFTU31cIj5cbiAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgIGNsYXNzPVwiJHtDQUxFTkRBUl9ORVhUX01PTlRIX0NMQVNTfVwiXG4gICAgICAgICAgICBhcmlhLWxhYmVsPVwiTmF2aWdhdGUgZm9yd2FyZCBvbmUgbW9udGhcIlxuICAgICAgICAgICAgJHtuZXh0QnV0dG9uc0Rpc2FibGVkID8gYGRpc2FibGVkPVwiZGlzYWJsZWRcImAgOiBcIlwifVxuICAgICAgICAgID48L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCIke0NBTEVOREFSX0NFTExfQ0xBU1N9ICR7Q0FMRU5EQVJfQ0VMTF9DRU5URVJfSVRFTVNfQ0xBU1N9XCI+XG4gICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICBjbGFzcz1cIiR7Q0FMRU5EQVJfTkVYVF9ZRUFSX0NMQVNTfVwiXG4gICAgICAgICAgICBhcmlhLWxhYmVsPVwiTmF2aWdhdGUgZm9yd2FyZCBvbmUgeWVhclwiXG4gICAgICAgICAgICAke25leHRCdXR0b25zRGlzYWJsZWQgPyBgZGlzYWJsZWQ9XCJkaXNhYmxlZFwiYCA6IFwiXCJ9XG4gICAgICAgICAgPjwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICAgIGA7XG5cbiAgY29uc3QgdGFibGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidGFibGVcIik7XG4gIHRhYmxlLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIENBTEVOREFSX1RBQkxFX0NMQVNTKTtcblxuICBjb25zdCB0YWJsZUhlYWQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidGhlYWRcIik7XG4gIHRhYmxlLmluc2VydEFkamFjZW50RWxlbWVudChcImJlZm9yZWVuZFwiLCB0YWJsZUhlYWQpO1xuICBjb25zdCB0YWJsZUhlYWRSb3cgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidHJcIik7XG4gIHRhYmxlSGVhZC5pbnNlcnRBZGphY2VudEVsZW1lbnQoXCJiZWZvcmVlbmRcIiwgdGFibGVIZWFkUm93KTtcblxuICBjb25zdCBkYXlzT2ZXZWVrID0ge1xuICAgIFN1bmRheTogXCJTXCIsXG4gICAgTW9uZGF5OiBcIk1cIixcbiAgICBUdWVzZGF5OiBcIlRcIixcbiAgICBXZWRuZXNkYXk6IFwiV1wiLFxuICAgIFRodXJzZGF5OiBcIlRoXCIsXG4gICAgRnJpZGF5OiBcIkZyXCIsXG4gICAgU2F0dXJkYXk6IFwiU1wiLFxuICB9O1xuXG4gIE9iamVjdC5rZXlzKGRheXNPZldlZWspLmZvckVhY2goKGtleSkgPT4ge1xuICAgIGNvbnN0IHRoID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInRoXCIpO1xuICAgIHRoLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIENBTEVOREFSX0RBWV9PRl9XRUVLX0NMQVNTKTtcbiAgICB0aC5zZXRBdHRyaWJ1dGUoXCJzY29wZVwiLCBcImNvbFwiKTtcbiAgICB0aC5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIGtleSk7XG4gICAgdGgudGV4dENvbnRlbnQgPSBkYXlzT2ZXZWVrW2tleV07XG4gICAgdGFibGVIZWFkUm93Lmluc2VydEFkamFjZW50RWxlbWVudChcImJlZm9yZWVuZFwiLCB0aCk7XG4gIH0pO1xuXG4gIGNvbnN0IHRhYmxlQm9keSA9IGNyZWF0ZVRhYmxlQm9keShkYXRlc0dyaWQpO1xuICB0YWJsZS5pbnNlcnRBZGphY2VudEVsZW1lbnQoXCJiZWZvcmVlbmRcIiwgdGFibGVCb2R5KTtcblxuICAvLyBDb250YWluZXIgZm9yIFllYXJzLCBNb250aHMsIGFuZCBEYXlzXG4gIGNvbnN0IGRhdGVQaWNrZXJDYWxlbmRhckNvbnRhaW5lciA9XG4gICAgbmV3Q2FsZW5kYXIucXVlcnlTZWxlY3RvcihDQUxFTkRBUl9EQVRFX1BJQ0tFUik7XG5cbiAgZGF0ZVBpY2tlckNhbGVuZGFyQ29udGFpbmVyLmluc2VydEFkamFjZW50RWxlbWVudChcImJlZm9yZWVuZFwiLCB0YWJsZSk7XG5cbiAgY2FsZW5kYXJFbC5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdDYWxlbmRhciwgY2FsZW5kYXJFbCk7XG5cbiAgZGF0ZVBpY2tlckVsLmNsYXNzTGlzdC5hZGQoREFURV9QSUNLRVJfQUNUSVZFX0NMQVNTKTtcblxuICBjb25zdCBzdGF0dXNlcyA9IFtdO1xuXG4gIGlmIChpc1NhbWVEYXkoc2VsZWN0ZWREYXRlLCBmb2N1c2VkRGF0ZSkpIHtcbiAgICBzdGF0dXNlcy5wdXNoKFwiU2VsZWN0ZWQgZGF0ZVwiKTtcbiAgfVxuXG4gIGlmIChjYWxlbmRhcldhc0hpZGRlbikge1xuICAgIHN0YXR1c2VzLnB1c2goXG4gICAgICBcIllvdSBjYW4gbmF2aWdhdGUgYnkgZGF5IHVzaW5nIGxlZnQgYW5kIHJpZ2h0IGFycm93c1wiLFxuICAgICAgXCJXZWVrcyBieSB1c2luZyB1cCBhbmQgZG93biBhcnJvd3NcIixcbiAgICAgIFwiTW9udGhzIGJ5IHVzaW5nIHBhZ2UgdXAgYW5kIHBhZ2UgZG93biBrZXlzXCIsXG4gICAgICBcIlllYXJzIGJ5IHVzaW5nIHNoaWZ0IHBsdXMgcGFnZSB1cCBhbmQgc2hpZnQgcGx1cyBwYWdlIGRvd25cIixcbiAgICAgIFwiSG9tZSBhbmQgZW5kIGtleXMgbmF2aWdhdGUgdG8gdGhlIGJlZ2lubmluZyBhbmQgZW5kIG9mIGEgd2Vla1wiXG4gICAgKTtcbiAgICBzdGF0dXNFbC50ZXh0Q29udGVudCA9IFwiXCI7XG4gIH0gZWxzZSB7XG4gICAgc3RhdHVzZXMucHVzaChgJHttb250aExhYmVsfSAke2ZvY3VzZWRZZWFyfWApO1xuICB9XG4gIHN0YXR1c0VsLnRleHRDb250ZW50ID0gc3RhdHVzZXMuam9pbihcIi4gXCIpO1xuXG4gIHJldHVybiBuZXdDYWxlbmRhcjtcbn07XG5cbi8qKlxuICogTmF2aWdhdGUgYmFjayBvbmUgeWVhciBhbmQgZGlzcGxheSB0aGUgY2FsZW5kYXIuXG4gKlxuICogQHBhcmFtIHtIVE1MQnV0dG9uRWxlbWVudH0gX2J1dHRvbkVsIEFuIGVsZW1lbnQgd2l0aGluIHRoZSBkYXRlIHBpY2tlciBjb21wb25lbnRcbiAqL1xuY29uc3QgZGlzcGxheVByZXZpb3VzWWVhciA9IChfYnV0dG9uRWwpID0+IHtcbiAgaWYgKF9idXR0b25FbC5kaXNhYmxlZCkgcmV0dXJuO1xuICBjb25zdCB7IGNhbGVuZGFyRWwsIGNhbGVuZGFyRGF0ZSwgbWluRGF0ZSwgbWF4RGF0ZSB9ID1cbiAgICBnZXREYXRlUGlja2VyQ29udGV4dChfYnV0dG9uRWwpO1xuICBsZXQgZGF0ZSA9IHN1YlllYXJzKGNhbGVuZGFyRGF0ZSwgMSk7XG4gIGRhdGUgPSBrZWVwRGF0ZUJldHdlZW5NaW5BbmRNYXgoZGF0ZSwgbWluRGF0ZSwgbWF4RGF0ZSk7XG4gIGNvbnN0IG5ld0NhbGVuZGFyID0gcmVuZGVyQ2FsZW5kYXIoY2FsZW5kYXJFbCwgZGF0ZSk7XG5cbiAgbGV0IG5leHRUb0ZvY3VzID0gbmV3Q2FsZW5kYXIucXVlcnlTZWxlY3RvcihDQUxFTkRBUl9QUkVWSU9VU19ZRUFSKTtcbiAgaWYgKG5leHRUb0ZvY3VzLmRpc2FibGVkKSB7XG4gICAgbmV4dFRvRm9jdXMgPSBuZXdDYWxlbmRhci5xdWVyeVNlbGVjdG9yKENBTEVOREFSX0RBVEVfUElDS0VSKTtcbiAgfVxuICBuZXh0VG9Gb2N1cy5mb2N1cygpO1xufTtcblxuLyoqXG4gKiBOYXZpZ2F0ZSBiYWNrIG9uZSBtb250aCBhbmQgZGlzcGxheSB0aGUgY2FsZW5kYXIuXG4gKlxuICogQHBhcmFtIHtIVE1MQnV0dG9uRWxlbWVudH0gX2J1dHRvbkVsIEFuIGVsZW1lbnQgd2l0aGluIHRoZSBkYXRlIHBpY2tlciBjb21wb25lbnRcbiAqL1xuY29uc3QgZGlzcGxheVByZXZpb3VzTW9udGggPSAoX2J1dHRvbkVsKSA9PiB7XG4gIGlmIChfYnV0dG9uRWwuZGlzYWJsZWQpIHJldHVybjtcbiAgY29uc3QgeyBjYWxlbmRhckVsLCBjYWxlbmRhckRhdGUsIG1pbkRhdGUsIG1heERhdGUgfSA9XG4gICAgZ2V0RGF0ZVBpY2tlckNvbnRleHQoX2J1dHRvbkVsKTtcbiAgbGV0IGRhdGUgPSBzdWJNb250aHMoY2FsZW5kYXJEYXRlLCAxKTtcbiAgZGF0ZSA9IGtlZXBEYXRlQmV0d2Vlbk1pbkFuZE1heChkYXRlLCBtaW5EYXRlLCBtYXhEYXRlKTtcbiAgY29uc3QgbmV3Q2FsZW5kYXIgPSByZW5kZXJDYWxlbmRhcihjYWxlbmRhckVsLCBkYXRlKTtcblxuICBsZXQgbmV4dFRvRm9jdXMgPSBuZXdDYWxlbmRhci5xdWVyeVNlbGVjdG9yKENBTEVOREFSX1BSRVZJT1VTX01PTlRIKTtcbiAgaWYgKG5leHRUb0ZvY3VzLmRpc2FibGVkKSB7XG4gICAgbmV4dFRvRm9jdXMgPSBuZXdDYWxlbmRhci5xdWVyeVNlbGVjdG9yKENBTEVOREFSX0RBVEVfUElDS0VSKTtcbiAgfVxuICBuZXh0VG9Gb2N1cy5mb2N1cygpO1xufTtcblxuLyoqXG4gKiBOYXZpZ2F0ZSBmb3J3YXJkIG9uZSBtb250aCBhbmQgZGlzcGxheSB0aGUgY2FsZW5kYXIuXG4gKlxuICogQHBhcmFtIHtIVE1MQnV0dG9uRWxlbWVudH0gX2J1dHRvbkVsIEFuIGVsZW1lbnQgd2l0aGluIHRoZSBkYXRlIHBpY2tlciBjb21wb25lbnRcbiAqL1xuY29uc3QgZGlzcGxheU5leHRNb250aCA9IChfYnV0dG9uRWwpID0+IHtcbiAgaWYgKF9idXR0b25FbC5kaXNhYmxlZCkgcmV0dXJuO1xuICBjb25zdCB7IGNhbGVuZGFyRWwsIGNhbGVuZGFyRGF0ZSwgbWluRGF0ZSwgbWF4RGF0ZSB9ID1cbiAgICBnZXREYXRlUGlja2VyQ29udGV4dChfYnV0dG9uRWwpO1xuICBsZXQgZGF0ZSA9IGFkZE1vbnRocyhjYWxlbmRhckRhdGUsIDEpO1xuICBkYXRlID0ga2VlcERhdGVCZXR3ZWVuTWluQW5kTWF4KGRhdGUsIG1pbkRhdGUsIG1heERhdGUpO1xuICBjb25zdCBuZXdDYWxlbmRhciA9IHJlbmRlckNhbGVuZGFyKGNhbGVuZGFyRWwsIGRhdGUpO1xuXG4gIGxldCBuZXh0VG9Gb2N1cyA9IG5ld0NhbGVuZGFyLnF1ZXJ5U2VsZWN0b3IoQ0FMRU5EQVJfTkVYVF9NT05USCk7XG4gIGlmIChuZXh0VG9Gb2N1cy5kaXNhYmxlZCkge1xuICAgIG5leHRUb0ZvY3VzID0gbmV3Q2FsZW5kYXIucXVlcnlTZWxlY3RvcihDQUxFTkRBUl9EQVRFX1BJQ0tFUik7XG4gIH1cbiAgbmV4dFRvRm9jdXMuZm9jdXMoKTtcbn07XG5cbi8qKlxuICogTmF2aWdhdGUgZm9yd2FyZCBvbmUgeWVhciBhbmQgZGlzcGxheSB0aGUgY2FsZW5kYXIuXG4gKlxuICogQHBhcmFtIHtIVE1MQnV0dG9uRWxlbWVudH0gX2J1dHRvbkVsIEFuIGVsZW1lbnQgd2l0aGluIHRoZSBkYXRlIHBpY2tlciBjb21wb25lbnRcbiAqL1xuY29uc3QgZGlzcGxheU5leHRZZWFyID0gKF9idXR0b25FbCkgPT4ge1xuICBpZiAoX2J1dHRvbkVsLmRpc2FibGVkKSByZXR1cm47XG4gIGNvbnN0IHsgY2FsZW5kYXJFbCwgY2FsZW5kYXJEYXRlLCBtaW5EYXRlLCBtYXhEYXRlIH0gPVxuICAgIGdldERhdGVQaWNrZXJDb250ZXh0KF9idXR0b25FbCk7XG4gIGxldCBkYXRlID0gYWRkWWVhcnMoY2FsZW5kYXJEYXRlLCAxKTtcbiAgZGF0ZSA9IGtlZXBEYXRlQmV0d2Vlbk1pbkFuZE1heChkYXRlLCBtaW5EYXRlLCBtYXhEYXRlKTtcbiAgY29uc3QgbmV3Q2FsZW5kYXIgPSByZW5kZXJDYWxlbmRhcihjYWxlbmRhckVsLCBkYXRlKTtcblxuICBsZXQgbmV4dFRvRm9jdXMgPSBuZXdDYWxlbmRhci5xdWVyeVNlbGVjdG9yKENBTEVOREFSX05FWFRfWUVBUik7XG4gIGlmIChuZXh0VG9Gb2N1cy5kaXNhYmxlZCkge1xuICAgIG5leHRUb0ZvY3VzID0gbmV3Q2FsZW5kYXIucXVlcnlTZWxlY3RvcihDQUxFTkRBUl9EQVRFX1BJQ0tFUik7XG4gIH1cbiAgbmV4dFRvRm9jdXMuZm9jdXMoKTtcbn07XG5cbi8qKlxuICogSGlkZSB0aGUgY2FsZW5kYXIgb2YgYSBkYXRlIHBpY2tlciBjb21wb25lbnQuXG4gKlxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWwgQW4gZWxlbWVudCB3aXRoaW4gdGhlIGRhdGUgcGlja2VyIGNvbXBvbmVudFxuICovXG5jb25zdCBoaWRlQ2FsZW5kYXIgPSAoZWwpID0+IHtcbiAgY29uc3QgeyBkYXRlUGlja2VyRWwsIGNhbGVuZGFyRWwsIHN0YXR1c0VsIH0gPSBnZXREYXRlUGlja2VyQ29udGV4dChlbCk7XG5cbiAgZGF0ZVBpY2tlckVsLmNsYXNzTGlzdC5yZW1vdmUoREFURV9QSUNLRVJfQUNUSVZFX0NMQVNTKTtcbiAgY2FsZW5kYXJFbC5oaWRkZW4gPSB0cnVlO1xuICBzdGF0dXNFbC50ZXh0Q29udGVudCA9IFwiXCI7XG59O1xuXG4vKipcbiAqIFNlbGVjdCBhIGRhdGUgd2l0aGluIHRoZSBkYXRlIHBpY2tlciBjb21wb25lbnQuXG4gKlxuICogQHBhcmFtIHtIVE1MQnV0dG9uRWxlbWVudH0gY2FsZW5kYXJEYXRlRWwgQSBkYXRlIGVsZW1lbnQgd2l0aGluIHRoZSBkYXRlIHBpY2tlciBjb21wb25lbnRcbiAqL1xuY29uc3Qgc2VsZWN0RGF0ZSA9IChjYWxlbmRhckRhdGVFbCkgPT4ge1xuICBpZiAoY2FsZW5kYXJEYXRlRWwuZGlzYWJsZWQpIHJldHVybjtcblxuICBjb25zdCB7IGRhdGVQaWNrZXJFbCwgZXh0ZXJuYWxJbnB1dEVsIH0gPVxuICAgIGdldERhdGVQaWNrZXJDb250ZXh0KGNhbGVuZGFyRGF0ZUVsKTtcblxuICBzZXRDYWxlbmRhclZhbHVlKGNhbGVuZGFyRGF0ZUVsLCBjYWxlbmRhckRhdGVFbC5kYXRhc2V0LnZhbHVlKTtcbiAgaGlkZUNhbGVuZGFyKGRhdGVQaWNrZXJFbCk7XG5cbiAgZXh0ZXJuYWxJbnB1dEVsLmZvY3VzKCk7XG59O1xuXG4vKipcbiAqIFRvZ2dsZSB0aGUgY2FsZW5kYXIuXG4gKlxuICogQHBhcmFtIHtIVE1MQnV0dG9uRWxlbWVudH0gZWwgQW4gZWxlbWVudCB3aXRoaW4gdGhlIGRhdGUgcGlja2VyIGNvbXBvbmVudFxuICovXG5jb25zdCB0b2dnbGVDYWxlbmRhciA9IChlbCkgPT4ge1xuICBpZiAoZWwuZGlzYWJsZWQpIHJldHVybjtcbiAgY29uc3QgeyBjYWxlbmRhckVsLCBpbnB1dERhdGUsIG1pbkRhdGUsIG1heERhdGUsIGRlZmF1bHREYXRlIH0gPVxuICAgIGdldERhdGVQaWNrZXJDb250ZXh0KGVsKTtcblxuICBpZiAoY2FsZW5kYXJFbC5oaWRkZW4pIHtcbiAgICBjb25zdCBkYXRlVG9EaXNwbGF5ID0ga2VlcERhdGVCZXR3ZWVuTWluQW5kTWF4KFxuICAgICAgaW5wdXREYXRlIHx8IGRlZmF1bHREYXRlIHx8IHRvZGF5KCksXG4gICAgICBtaW5EYXRlLFxuICAgICAgbWF4RGF0ZVxuICAgICk7XG4gICAgY29uc3QgbmV3Q2FsZW5kYXIgPSByZW5kZXJDYWxlbmRhcihjYWxlbmRhckVsLCBkYXRlVG9EaXNwbGF5KTtcbiAgICBuZXdDYWxlbmRhci5xdWVyeVNlbGVjdG9yKENBTEVOREFSX0RBVEVfRk9DVVNFRCkuZm9jdXMoKTtcbiAgfSBlbHNlIHtcbiAgICBoaWRlQ2FsZW5kYXIoZWwpO1xuICB9XG59O1xuXG4vKipcbiAqIFVwZGF0ZSB0aGUgY2FsZW5kYXIgd2hlbiB2aXNpYmxlLlxuICpcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsIGFuIGVsZW1lbnQgd2l0aGluIHRoZSBkYXRlIHBpY2tlclxuICovXG5jb25zdCB1cGRhdGVDYWxlbmRhcklmVmlzaWJsZSA9IChlbCkgPT4ge1xuICBjb25zdCB7IGNhbGVuZGFyRWwsIGlucHV0RGF0ZSwgbWluRGF0ZSwgbWF4RGF0ZSB9ID0gZ2V0RGF0ZVBpY2tlckNvbnRleHQoZWwpO1xuICBjb25zdCBjYWxlbmRhclNob3duID0gIWNhbGVuZGFyRWwuaGlkZGVuO1xuXG4gIGlmIChjYWxlbmRhclNob3duICYmIGlucHV0RGF0ZSkge1xuICAgIGNvbnN0IGRhdGVUb0Rpc3BsYXkgPSBrZWVwRGF0ZUJldHdlZW5NaW5BbmRNYXgoaW5wdXREYXRlLCBtaW5EYXRlLCBtYXhEYXRlKTtcbiAgICByZW5kZXJDYWxlbmRhcihjYWxlbmRhckVsLCBkYXRlVG9EaXNwbGF5KTtcbiAgfVxufTtcblxuLy8gI2VuZHJlZ2lvbiBDYWxlbmRhciAtIERhdGUgU2VsZWN0aW9uIFZpZXdcblxuLy8gI3JlZ2lvbiBDYWxlbmRhciAtIE1vbnRoIFNlbGVjdGlvbiBWaWV3XG4vKipcbiAqIERpc3BsYXkgdGhlIG1vbnRoIHNlbGVjdGlvbiBzY3JlZW4gaW4gdGhlIGRhdGUgcGlja2VyLlxuICpcbiAqIEBwYXJhbSB7SFRNTEJ1dHRvbkVsZW1lbnR9IGVsIEFuIGVsZW1lbnQgd2l0aGluIHRoZSBkYXRlIHBpY2tlciBjb21wb25lbnRcbiAqIEByZXR1cm5zIHtIVE1MRWxlbWVudH0gYSByZWZlcmVuY2UgdG8gdGhlIG5ldyBjYWxlbmRhciBlbGVtZW50XG4gKi9cbmNvbnN0IGRpc3BsYXlNb250aFNlbGVjdGlvbiA9IChlbCwgbW9udGhUb0Rpc3BsYXkpID0+IHtcbiAgY29uc3QgeyBjYWxlbmRhckVsLCBzdGF0dXNFbCwgY2FsZW5kYXJEYXRlLCBtaW5EYXRlLCBtYXhEYXRlIH0gPVxuICAgIGdldERhdGVQaWNrZXJDb250ZXh0KGVsKTtcblxuICBjb25zdCBzZWxlY3RlZE1vbnRoID0gY2FsZW5kYXJEYXRlLmdldE1vbnRoKCk7XG4gIGNvbnN0IGZvY3VzZWRNb250aCA9IG1vbnRoVG9EaXNwbGF5ID09IG51bGwgPyBzZWxlY3RlZE1vbnRoIDogbW9udGhUb0Rpc3BsYXk7XG5cbiAgY29uc3QgbW9udGhzID0gTU9OVEhfTEFCRUxTLm1hcCgobW9udGgsIGluZGV4KSA9PiB7XG4gICAgY29uc3QgbW9udGhUb0NoZWNrID0gc2V0TW9udGgoY2FsZW5kYXJEYXRlLCBpbmRleCk7XG5cbiAgICBjb25zdCBpc0Rpc2FibGVkID0gaXNEYXRlc01vbnRoT3V0c2lkZU1pbk9yTWF4KFxuICAgICAgbW9udGhUb0NoZWNrLFxuICAgICAgbWluRGF0ZSxcbiAgICAgIG1heERhdGVcbiAgICApO1xuXG4gICAgbGV0IHRhYmluZGV4ID0gXCItMVwiO1xuXG4gICAgY29uc3QgY2xhc3NlcyA9IFtDQUxFTkRBUl9NT05USF9DTEFTU107XG4gICAgY29uc3QgaXNTZWxlY3RlZCA9IGluZGV4ID09PSBzZWxlY3RlZE1vbnRoO1xuXG4gICAgaWYgKGluZGV4ID09PSBmb2N1c2VkTW9udGgpIHtcbiAgICAgIHRhYmluZGV4ID0gXCIwXCI7XG4gICAgICBjbGFzc2VzLnB1c2goQ0FMRU5EQVJfTU9OVEhfRk9DVVNFRF9DTEFTUyk7XG4gICAgfVxuXG4gICAgaWYgKGlzU2VsZWN0ZWQpIHtcbiAgICAgIGNsYXNzZXMucHVzaChDQUxFTkRBUl9NT05USF9TRUxFQ1RFRF9DTEFTUyk7XG4gICAgfVxuXG4gICAgY29uc3QgYnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcbiAgICBidG4uc2V0QXR0cmlidXRlKFwidHlwZVwiLCBcImJ1dHRvblwiKTtcbiAgICBidG4uc2V0QXR0cmlidXRlKFwidGFiaW5kZXhcIiwgdGFiaW5kZXgpO1xuICAgIGJ0bi5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCBjbGFzc2VzLmpvaW4oXCIgXCIpKTtcbiAgICBidG4uc2V0QXR0cmlidXRlKFwiZGF0YS12YWx1ZVwiLCBpbmRleCk7XG4gICAgYnRuLnNldEF0dHJpYnV0ZShcImRhdGEtbGFiZWxcIiwgbW9udGgpO1xuICAgIGJ0bi5zZXRBdHRyaWJ1dGUoXCJhcmlhLXNlbGVjdGVkXCIsIGlzU2VsZWN0ZWQgPyBcInRydWVcIiA6IFwiZmFsc2VcIik7XG4gICAgaWYgKGlzRGlzYWJsZWQgPT09IHRydWUpIHtcbiAgICAgIGJ0bi5kaXNhYmxlZCA9IHRydWU7XG4gICAgfVxuICAgIGJ0bi50ZXh0Q29udGVudCA9IG1vbnRoO1xuXG4gICAgcmV0dXJuIGJ0bjtcbiAgfSk7XG5cbiAgY29uc3QgbW9udGhzSHRtbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gIG1vbnRoc0h0bWwuc2V0QXR0cmlidXRlKFwidGFiaW5kZXhcIiwgXCItMVwiKTtcbiAgbW9udGhzSHRtbC5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCBDQUxFTkRBUl9NT05USF9QSUNLRVJfQ0xBU1MpO1xuXG4gIGNvbnN0IHRhYmxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInRhYmxlXCIpO1xuICB0YWJsZS5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCBDQUxFTkRBUl9UQUJMRV9DTEFTUyk7XG4gIHRhYmxlLnNldEF0dHJpYnV0ZShcInJvbGVcIiwgXCJwcmVzZW50YXRpb25cIik7XG5cbiAgY29uc3QgbW9udGhzR3JpZCA9IGxpc3RUb0dyaWRIdG1sKG1vbnRocywgMyk7XG4gIGNvbnN0IHRhYmxlQm9keSA9IGNyZWF0ZVRhYmxlQm9keShtb250aHNHcmlkKTtcbiAgdGFibGUuaW5zZXJ0QWRqYWNlbnRFbGVtZW50KFwiYmVmb3JlZW5kXCIsIHRhYmxlQm9keSk7XG4gIG1vbnRoc0h0bWwuaW5zZXJ0QWRqYWNlbnRFbGVtZW50KFwiYmVmb3JlZW5kXCIsIHRhYmxlKTtcblxuICBjb25zdCBuZXdDYWxlbmRhciA9IGNhbGVuZGFyRWwuY2xvbmVOb2RlKCk7XG4gIG5ld0NhbGVuZGFyLmluc2VydEFkamFjZW50RWxlbWVudChcImJlZm9yZWVuZFwiLCBtb250aHNIdG1sKTtcbiAgY2FsZW5kYXJFbC5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdDYWxlbmRhciwgY2FsZW5kYXJFbCk7XG5cbiAgc3RhdHVzRWwudGV4dENvbnRlbnQgPSBcIlNlbGVjdCBhIG1vbnRoLlwiO1xuXG4gIHJldHVybiBuZXdDYWxlbmRhcjtcbn07XG5cbi8qKlxuICogU2VsZWN0IGEgbW9udGggaW4gdGhlIGRhdGUgcGlja2VyIGNvbXBvbmVudC5cbiAqXG4gKiBAcGFyYW0ge0hUTUxCdXR0b25FbGVtZW50fSBtb250aEVsIEFuIG1vbnRoIGVsZW1lbnQgd2l0aGluIHRoZSBkYXRlIHBpY2tlciBjb21wb25lbnRcbiAqL1xuY29uc3Qgc2VsZWN0TW9udGggPSAobW9udGhFbCkgPT4ge1xuICBpZiAobW9udGhFbC5kaXNhYmxlZCkgcmV0dXJuO1xuICBjb25zdCB7IGNhbGVuZGFyRWwsIGNhbGVuZGFyRGF0ZSwgbWluRGF0ZSwgbWF4RGF0ZSB9ID1cbiAgICBnZXREYXRlUGlja2VyQ29udGV4dChtb250aEVsKTtcbiAgY29uc3Qgc2VsZWN0ZWRNb250aCA9IHBhcnNlSW50KG1vbnRoRWwuZGF0YXNldC52YWx1ZSwgMTApO1xuICBsZXQgZGF0ZSA9IHNldE1vbnRoKGNhbGVuZGFyRGF0ZSwgc2VsZWN0ZWRNb250aCk7XG4gIGRhdGUgPSBrZWVwRGF0ZUJldHdlZW5NaW5BbmRNYXgoZGF0ZSwgbWluRGF0ZSwgbWF4RGF0ZSk7XG4gIGNvbnN0IG5ld0NhbGVuZGFyID0gcmVuZGVyQ2FsZW5kYXIoY2FsZW5kYXJFbCwgZGF0ZSk7XG4gIG5ld0NhbGVuZGFyLnF1ZXJ5U2VsZWN0b3IoQ0FMRU5EQVJfREFURV9GT0NVU0VEKS5mb2N1cygpO1xufTtcblxuLy8gI2VuZHJlZ2lvbiBDYWxlbmRhciAtIE1vbnRoIFNlbGVjdGlvbiBWaWV3XG5cbi8vICNyZWdpb24gQ2FsZW5kYXIgLSBZZWFyIFNlbGVjdGlvbiBWaWV3XG5cbi8qKlxuICogRGlzcGxheSB0aGUgeWVhciBzZWxlY3Rpb24gc2NyZWVuIGluIHRoZSBkYXRlIHBpY2tlci5cbiAqXG4gKiBAcGFyYW0ge0hUTUxCdXR0b25FbGVtZW50fSBlbCBBbiBlbGVtZW50IHdpdGhpbiB0aGUgZGF0ZSBwaWNrZXIgY29tcG9uZW50XG4gKiBAcGFyYW0ge251bWJlcn0geWVhclRvRGlzcGxheSB5ZWFyIHRvIGRpc3BsYXkgaW4geWVhciBzZWxlY3Rpb25cbiAqIEByZXR1cm5zIHtIVE1MRWxlbWVudH0gYSByZWZlcmVuY2UgdG8gdGhlIG5ldyBjYWxlbmRhciBlbGVtZW50XG4gKi9cbmNvbnN0IGRpc3BsYXlZZWFyU2VsZWN0aW9uID0gKGVsLCB5ZWFyVG9EaXNwbGF5KSA9PiB7XG4gIGNvbnN0IHsgY2FsZW5kYXJFbCwgc3RhdHVzRWwsIGNhbGVuZGFyRGF0ZSwgbWluRGF0ZSwgbWF4RGF0ZSB9ID1cbiAgICBnZXREYXRlUGlja2VyQ29udGV4dChlbCk7XG5cbiAgY29uc3Qgc2VsZWN0ZWRZZWFyID0gY2FsZW5kYXJEYXRlLmdldEZ1bGxZZWFyKCk7XG4gIGNvbnN0IGZvY3VzZWRZZWFyID0geWVhclRvRGlzcGxheSA9PSBudWxsID8gc2VsZWN0ZWRZZWFyIDogeWVhclRvRGlzcGxheTtcblxuICBsZXQgeWVhclRvQ2h1bmsgPSBmb2N1c2VkWWVhcjtcbiAgeWVhclRvQ2h1bmsgLT0geWVhclRvQ2h1bmsgJSBZRUFSX0NIVU5LO1xuICB5ZWFyVG9DaHVuayA9IE1hdGgubWF4KDAsIHllYXJUb0NodW5rKTtcblxuICBjb25zdCBwcmV2WWVhckNodW5rRGlzYWJsZWQgPSBpc0RhdGVzWWVhck91dHNpZGVNaW5Pck1heChcbiAgICBzZXRZZWFyKGNhbGVuZGFyRGF0ZSwgeWVhclRvQ2h1bmsgLSAxKSxcbiAgICBtaW5EYXRlLFxuICAgIG1heERhdGVcbiAgKTtcblxuICBjb25zdCBuZXh0WWVhckNodW5rRGlzYWJsZWQgPSBpc0RhdGVzWWVhck91dHNpZGVNaW5Pck1heChcbiAgICBzZXRZZWFyKGNhbGVuZGFyRGF0ZSwgeWVhclRvQ2h1bmsgKyBZRUFSX0NIVU5LKSxcbiAgICBtaW5EYXRlLFxuICAgIG1heERhdGVcbiAgKTtcblxuICBjb25zdCB5ZWFycyA9IFtdO1xuICBsZXQgeWVhckluZGV4ID0geWVhclRvQ2h1bms7XG4gIHdoaWxlICh5ZWFycy5sZW5ndGggPCBZRUFSX0NIVU5LKSB7XG4gICAgY29uc3QgaXNEaXNhYmxlZCA9IGlzRGF0ZXNZZWFyT3V0c2lkZU1pbk9yTWF4KFxuICAgICAgc2V0WWVhcihjYWxlbmRhckRhdGUsIHllYXJJbmRleCksXG4gICAgICBtaW5EYXRlLFxuICAgICAgbWF4RGF0ZVxuICAgICk7XG5cbiAgICBsZXQgdGFiaW5kZXggPSBcIi0xXCI7XG5cbiAgICBjb25zdCBjbGFzc2VzID0gW0NBTEVOREFSX1lFQVJfQ0xBU1NdO1xuICAgIGNvbnN0IGlzU2VsZWN0ZWQgPSB5ZWFySW5kZXggPT09IHNlbGVjdGVkWWVhcjtcblxuICAgIGlmICh5ZWFySW5kZXggPT09IGZvY3VzZWRZZWFyKSB7XG4gICAgICB0YWJpbmRleCA9IFwiMFwiO1xuICAgICAgY2xhc3Nlcy5wdXNoKENBTEVOREFSX1lFQVJfRk9DVVNFRF9DTEFTUyk7XG4gICAgfVxuXG4gICAgaWYgKGlzU2VsZWN0ZWQpIHtcbiAgICAgIGNsYXNzZXMucHVzaChDQUxFTkRBUl9ZRUFSX1NFTEVDVEVEX0NMQVNTKTtcbiAgICB9XG5cbiAgICBjb25zdCBidG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpO1xuICAgIGJ0bi5zZXRBdHRyaWJ1dGUoXCJ0eXBlXCIsIFwiYnV0dG9uXCIpO1xuICAgIGJ0bi5zZXRBdHRyaWJ1dGUoXCJ0YWJpbmRleFwiLCB0YWJpbmRleCk7XG4gICAgYnRuLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIGNsYXNzZXMuam9pbihcIiBcIikpO1xuICAgIGJ0bi5zZXRBdHRyaWJ1dGUoXCJkYXRhLXZhbHVlXCIsIHllYXJJbmRleCk7XG4gICAgYnRuLnNldEF0dHJpYnV0ZShcImFyaWEtc2VsZWN0ZWRcIiwgaXNTZWxlY3RlZCA/IFwidHJ1ZVwiIDogXCJmYWxzZVwiKTtcbiAgICBpZiAoaXNEaXNhYmxlZCA9PT0gdHJ1ZSkge1xuICAgICAgYnRuLmRpc2FibGVkID0gdHJ1ZTtcbiAgICB9XG4gICAgYnRuLnRleHRDb250ZW50ID0geWVhckluZGV4O1xuXG4gICAgeWVhcnMucHVzaChidG4pO1xuICAgIHllYXJJbmRleCArPSAxO1xuICB9XG5cbiAgY29uc3QgbmV3Q2FsZW5kYXIgPSBjYWxlbmRhckVsLmNsb25lTm9kZSgpO1xuXG4gIC8vIGNyZWF0ZSB0aGUgeWVhcnMgY2FsZW5kYXIgd3JhcHBlclxuICBjb25zdCB5ZWFyc0NhbGVuZGFyV3JhcHBlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gIHllYXJzQ2FsZW5kYXJXcmFwcGVyLnNldEF0dHJpYnV0ZShcInRhYmluZGV4XCIsIFwiLTFcIik7XG4gIHllYXJzQ2FsZW5kYXJXcmFwcGVyLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIENBTEVOREFSX1lFQVJfUElDS0VSX0NMQVNTKTtcblxuICAvLyBjcmVhdGUgdGFibGUgcGFyZW50XG4gIGNvbnN0IHllYXJzVGFibGVQYXJlbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidGFibGVcIik7XG4gIHllYXJzVGFibGVQYXJlbnQuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgQ0FMRU5EQVJfVEFCTEVfQ0xBU1MpO1xuXG4gIC8vIGNyZWF0ZSB0YWJsZSBib2R5IGFuZCB0YWJsZSByb3dcbiAgY29uc3QgeWVhcnNIVE1MVGFibGVCb2R5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInRib2R5XCIpO1xuICBjb25zdCB5ZWFyc0hUTUxUYWJsZUJvZHlSb3cgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidHJcIik7XG5cbiAgLy8gY3JlYXRlIHByZXZpb3VzIGJ1dHRvblxuICBjb25zdCBwcmV2aW91c1llYXJzQnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcbiAgcHJldmlvdXNZZWFyc0J0bi5zZXRBdHRyaWJ1dGUoXCJ0eXBlXCIsIFwiYnV0dG9uXCIpO1xuICBwcmV2aW91c1llYXJzQnRuLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIENBTEVOREFSX1BSRVZJT1VTX1lFQVJfQ0hVTktfQ0xBU1MpO1xuICBwcmV2aW91c1llYXJzQnRuLnNldEF0dHJpYnV0ZShcbiAgICBcImFyaWEtbGFiZWxcIixcbiAgICBgTmF2aWdhdGUgYmFjayAke1lFQVJfQ0hVTkt9IHllYXJzYFxuICApO1xuICBpZiAocHJldlllYXJDaHVua0Rpc2FibGVkID09PSB0cnVlKSB7XG4gICAgcHJldmlvdXNZZWFyc0J0bi5kaXNhYmxlZCA9IHRydWU7XG4gIH1cbiAgcHJldmlvdXNZZWFyc0J0bi5pbm5lckhUTUwgPSBTYW5pdGl6ZXIuZXNjYXBlSFRNTGAmbmJzcGA7XG5cbiAgLy8gY3JlYXRlIG5leHQgYnV0dG9uXG4gIGNvbnN0IG5leHRZZWFyc0J0biA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJidXR0b25cIik7XG4gIG5leHRZZWFyc0J0bi5zZXRBdHRyaWJ1dGUoXCJ0eXBlXCIsIFwiYnV0dG9uXCIpO1xuICBuZXh0WWVhcnNCdG4uc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgQ0FMRU5EQVJfTkVYVF9ZRUFSX0NIVU5LX0NMQVNTKTtcbiAgbmV4dFllYXJzQnRuLnNldEF0dHJpYnV0ZShcbiAgICBcImFyaWEtbGFiZWxcIixcbiAgICBgTmF2aWdhdGUgZm9yd2FyZCAke1lFQVJfQ0hVTkt9IHllYXJzYFxuICApO1xuICBpZiAobmV4dFllYXJDaHVua0Rpc2FibGVkID09PSB0cnVlKSB7XG4gICAgbmV4dFllYXJzQnRuLmRpc2FibGVkID0gdHJ1ZTtcbiAgfVxuICBuZXh0WWVhcnNCdG4uaW5uZXJIVE1MID0gU2FuaXRpemVyLmVzY2FwZUhUTUxgJm5ic3BgO1xuXG4gIC8vIGNyZWF0ZSB0aGUgYWN0dWFsIHllYXJzIHRhYmxlXG4gIGNvbnN0IHllYXJzVGFibGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidGFibGVcIik7XG4gIHllYXJzVGFibGUuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgQ0FMRU5EQVJfVEFCTEVfQ0xBU1MpO1xuICB5ZWFyc1RhYmxlLnNldEF0dHJpYnV0ZShcInJvbGVcIiwgXCJwcmVzZW50YXRpb25cIik7XG5cbiAgLy8gY3JlYXRlIHRoZSB5ZWFycyBjaGlsZCB0YWJsZVxuICBjb25zdCB5ZWFyc0dyaWQgPSBsaXN0VG9HcmlkSHRtbCh5ZWFycywgMyk7XG4gIGNvbnN0IHllYXJzVGFibGVCb2R5ID0gY3JlYXRlVGFibGVCb2R5KHllYXJzR3JpZCk7XG5cbiAgLy8gYXBwZW5kIHRoZSBncmlkIHRvIHRoZSB5ZWFycyBjaGlsZCB0YWJsZVxuICB5ZWFyc1RhYmxlLmluc2VydEFkamFjZW50RWxlbWVudChcImJlZm9yZWVuZFwiLCB5ZWFyc1RhYmxlQm9keSk7XG5cbiAgLy8gY3JlYXRlIHRoZSBwcmV2IGJ1dHRvbiB0ZCBhbmQgYXBwZW5kIHRoZSBwcmV2IGJ1dHRvblxuICBjb25zdCB5ZWFyc0hUTUxUYWJsZUJvZHlEZXRhaWxQcmV2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInRkXCIpO1xuICB5ZWFyc0hUTUxUYWJsZUJvZHlEZXRhaWxQcmV2Lmluc2VydEFkamFjZW50RWxlbWVudChcbiAgICBcImJlZm9yZWVuZFwiLFxuICAgIHByZXZpb3VzWWVhcnNCdG5cbiAgKTtcblxuICAvLyBjcmVhdGUgdGhlIHllYXJzIHRkIGFuZCBhcHBlbmQgdGhlIHllYXJzIGNoaWxkIHRhYmxlXG4gIGNvbnN0IHllYXJzSFRNTFRhYmxlQm9keVllYXJzRGV0YWlsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInRkXCIpO1xuICB5ZWFyc0hUTUxUYWJsZUJvZHlZZWFyc0RldGFpbC5zZXRBdHRyaWJ1dGUoXCJjb2xzcGFuXCIsIFwiM1wiKTtcbiAgeWVhcnNIVE1MVGFibGVCb2R5WWVhcnNEZXRhaWwuaW5zZXJ0QWRqYWNlbnRFbGVtZW50KFwiYmVmb3JlZW5kXCIsIHllYXJzVGFibGUpO1xuXG4gIC8vIGNyZWF0ZSB0aGUgbmV4dCBidXR0b24gdGQgYW5kIGFwcGVuZCB0aGUgbmV4dCBidXR0b25cbiAgY29uc3QgeWVhcnNIVE1MVGFibGVCb2R5RGV0YWlsTmV4dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJ0ZFwiKTtcbiAgeWVhcnNIVE1MVGFibGVCb2R5RGV0YWlsTmV4dC5pbnNlcnRBZGphY2VudEVsZW1lbnQoXCJiZWZvcmVlbmRcIiwgbmV4dFllYXJzQnRuKTtcblxuICAvLyBhcHBlbmQgdGhlIHRocmVlIHRkIHRvIHRoZSB5ZWFycyBjaGlsZCB0YWJsZSByb3dcbiAgeWVhcnNIVE1MVGFibGVCb2R5Um93Lmluc2VydEFkamFjZW50RWxlbWVudChcbiAgICBcImJlZm9yZWVuZFwiLFxuICAgIHllYXJzSFRNTFRhYmxlQm9keURldGFpbFByZXZcbiAgKTtcbiAgeWVhcnNIVE1MVGFibGVCb2R5Um93Lmluc2VydEFkamFjZW50RWxlbWVudChcbiAgICBcImJlZm9yZWVuZFwiLFxuICAgIHllYXJzSFRNTFRhYmxlQm9keVllYXJzRGV0YWlsXG4gICk7XG4gIHllYXJzSFRNTFRhYmxlQm9keVJvdy5pbnNlcnRBZGphY2VudEVsZW1lbnQoXG4gICAgXCJiZWZvcmVlbmRcIixcbiAgICB5ZWFyc0hUTUxUYWJsZUJvZHlEZXRhaWxOZXh0XG4gICk7XG5cbiAgLy8gYXBwZW5kIHRoZSB0YWJsZSByb3cgdG8gdGhlIHllYXJzIGNoaWxkIHRhYmxlIGJvZHlcbiAgeWVhcnNIVE1MVGFibGVCb2R5Lmluc2VydEFkamFjZW50RWxlbWVudChcImJlZm9yZWVuZFwiLCB5ZWFyc0hUTUxUYWJsZUJvZHlSb3cpO1xuXG4gIC8vIGFwcGVuZCB0aGUgeWVhcnMgdGFibGUgYm9keSB0byB0aGUgeWVhcnMgcGFyZW50IHRhYmxlXG4gIHllYXJzVGFibGVQYXJlbnQuaW5zZXJ0QWRqYWNlbnRFbGVtZW50KFwiYmVmb3JlZW5kXCIsIHllYXJzSFRNTFRhYmxlQm9keSk7XG5cbiAgLy8gYXBwZW5kIHRoZSBwYXJlbnQgdGFibGUgdG8gdGhlIGNhbGVuZGFyIHdyYXBwZXJcbiAgeWVhcnNDYWxlbmRhcldyYXBwZXIuaW5zZXJ0QWRqYWNlbnRFbGVtZW50KFwiYmVmb3JlZW5kXCIsIHllYXJzVGFibGVQYXJlbnQpO1xuXG4gIC8vIGFwcGVuZCB0aGUgeWVhcnMgY2FsZW5kZXIgdG8gdGhlIG5ldyBjYWxlbmRhclxuICBuZXdDYWxlbmRhci5pbnNlcnRBZGphY2VudEVsZW1lbnQoXCJiZWZvcmVlbmRcIiwgeWVhcnNDYWxlbmRhcldyYXBwZXIpO1xuXG4gIC8vIHJlcGxhY2UgY2FsZW5kYXJcbiAgY2FsZW5kYXJFbC5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdDYWxlbmRhciwgY2FsZW5kYXJFbCk7XG5cbiAgc3RhdHVzRWwudGV4dENvbnRlbnQgPSBTYW5pdGl6ZXIuZXNjYXBlSFRNTGBTaG93aW5nIHllYXJzICR7eWVhclRvQ2h1bmt9IHRvICR7XG4gICAgeWVhclRvQ2h1bmsgKyBZRUFSX0NIVU5LIC0gMVxuICB9LiBTZWxlY3QgYSB5ZWFyLmA7XG5cbiAgcmV0dXJuIG5ld0NhbGVuZGFyO1xufTtcblxuLyoqXG4gKiBOYXZpZ2F0ZSBiYWNrIGJ5IHllYXJzIGFuZCBkaXNwbGF5IHRoZSB5ZWFyIHNlbGVjdGlvbiBzY3JlZW4uXG4gKlxuICogQHBhcmFtIHtIVE1MQnV0dG9uRWxlbWVudH0gZWwgQW4gZWxlbWVudCB3aXRoaW4gdGhlIGRhdGUgcGlja2VyIGNvbXBvbmVudFxuICovXG5jb25zdCBkaXNwbGF5UHJldmlvdXNZZWFyQ2h1bmsgPSAoZWwpID0+IHtcbiAgaWYgKGVsLmRpc2FibGVkKSByZXR1cm47XG5cbiAgY29uc3QgeyBjYWxlbmRhckVsLCBjYWxlbmRhckRhdGUsIG1pbkRhdGUsIG1heERhdGUgfSA9XG4gICAgZ2V0RGF0ZVBpY2tlckNvbnRleHQoZWwpO1xuICBjb25zdCB5ZWFyRWwgPSBjYWxlbmRhckVsLnF1ZXJ5U2VsZWN0b3IoQ0FMRU5EQVJfWUVBUl9GT0NVU0VEKTtcbiAgY29uc3Qgc2VsZWN0ZWRZZWFyID0gcGFyc2VJbnQoeWVhckVsLnRleHRDb250ZW50LCAxMCk7XG5cbiAgbGV0IGFkanVzdGVkWWVhciA9IHNlbGVjdGVkWWVhciAtIFlFQVJfQ0hVTks7XG4gIGFkanVzdGVkWWVhciA9IE1hdGgubWF4KDAsIGFkanVzdGVkWWVhcik7XG5cbiAgY29uc3QgZGF0ZSA9IHNldFllYXIoY2FsZW5kYXJEYXRlLCBhZGp1c3RlZFllYXIpO1xuICBjb25zdCBjYXBwZWREYXRlID0ga2VlcERhdGVCZXR3ZWVuTWluQW5kTWF4KGRhdGUsIG1pbkRhdGUsIG1heERhdGUpO1xuICBjb25zdCBuZXdDYWxlbmRhciA9IGRpc3BsYXlZZWFyU2VsZWN0aW9uKFxuICAgIGNhbGVuZGFyRWwsXG4gICAgY2FwcGVkRGF0ZS5nZXRGdWxsWWVhcigpXG4gICk7XG5cbiAgbGV0IG5leHRUb0ZvY3VzID0gbmV3Q2FsZW5kYXIucXVlcnlTZWxlY3RvcihDQUxFTkRBUl9QUkVWSU9VU19ZRUFSX0NIVU5LKTtcbiAgaWYgKG5leHRUb0ZvY3VzLmRpc2FibGVkKSB7XG4gICAgbmV4dFRvRm9jdXMgPSBuZXdDYWxlbmRhci5xdWVyeVNlbGVjdG9yKENBTEVOREFSX1lFQVJfUElDS0VSKTtcbiAgfVxuICBuZXh0VG9Gb2N1cy5mb2N1cygpO1xufTtcblxuLyoqXG4gKiBOYXZpZ2F0ZSBmb3J3YXJkIGJ5IHllYXJzIGFuZCBkaXNwbGF5IHRoZSB5ZWFyIHNlbGVjdGlvbiBzY3JlZW4uXG4gKlxuICogQHBhcmFtIHtIVE1MQnV0dG9uRWxlbWVudH0gZWwgQW4gZWxlbWVudCB3aXRoaW4gdGhlIGRhdGUgcGlja2VyIGNvbXBvbmVudFxuICovXG5jb25zdCBkaXNwbGF5TmV4dFllYXJDaHVuayA9IChlbCkgPT4ge1xuICBpZiAoZWwuZGlzYWJsZWQpIHJldHVybjtcblxuICBjb25zdCB7IGNhbGVuZGFyRWwsIGNhbGVuZGFyRGF0ZSwgbWluRGF0ZSwgbWF4RGF0ZSB9ID1cbiAgICBnZXREYXRlUGlja2VyQ29udGV4dChlbCk7XG4gIGNvbnN0IHllYXJFbCA9IGNhbGVuZGFyRWwucXVlcnlTZWxlY3RvcihDQUxFTkRBUl9ZRUFSX0ZPQ1VTRUQpO1xuICBjb25zdCBzZWxlY3RlZFllYXIgPSBwYXJzZUludCh5ZWFyRWwudGV4dENvbnRlbnQsIDEwKTtcblxuICBsZXQgYWRqdXN0ZWRZZWFyID0gc2VsZWN0ZWRZZWFyICsgWUVBUl9DSFVOSztcbiAgYWRqdXN0ZWRZZWFyID0gTWF0aC5tYXgoMCwgYWRqdXN0ZWRZZWFyKTtcblxuICBjb25zdCBkYXRlID0gc2V0WWVhcihjYWxlbmRhckRhdGUsIGFkanVzdGVkWWVhcik7XG4gIGNvbnN0IGNhcHBlZERhdGUgPSBrZWVwRGF0ZUJldHdlZW5NaW5BbmRNYXgoZGF0ZSwgbWluRGF0ZSwgbWF4RGF0ZSk7XG4gIGNvbnN0IG5ld0NhbGVuZGFyID0gZGlzcGxheVllYXJTZWxlY3Rpb24oXG4gICAgY2FsZW5kYXJFbCxcbiAgICBjYXBwZWREYXRlLmdldEZ1bGxZZWFyKClcbiAgKTtcblxuICBsZXQgbmV4dFRvRm9jdXMgPSBuZXdDYWxlbmRhci5xdWVyeVNlbGVjdG9yKENBTEVOREFSX05FWFRfWUVBUl9DSFVOSyk7XG4gIGlmIChuZXh0VG9Gb2N1cy5kaXNhYmxlZCkge1xuICAgIG5leHRUb0ZvY3VzID0gbmV3Q2FsZW5kYXIucXVlcnlTZWxlY3RvcihDQUxFTkRBUl9ZRUFSX1BJQ0tFUik7XG4gIH1cbiAgbmV4dFRvRm9jdXMuZm9jdXMoKTtcbn07XG5cbi8qKlxuICogU2VsZWN0IGEgeWVhciBpbiB0aGUgZGF0ZSBwaWNrZXIgY29tcG9uZW50LlxuICpcbiAqIEBwYXJhbSB7SFRNTEJ1dHRvbkVsZW1lbnR9IHllYXJFbCBBIHllYXIgZWxlbWVudCB3aXRoaW4gdGhlIGRhdGUgcGlja2VyIGNvbXBvbmVudFxuICovXG5jb25zdCBzZWxlY3RZZWFyID0gKHllYXJFbCkgPT4ge1xuICBpZiAoeWVhckVsLmRpc2FibGVkKSByZXR1cm47XG4gIGNvbnN0IHsgY2FsZW5kYXJFbCwgY2FsZW5kYXJEYXRlLCBtaW5EYXRlLCBtYXhEYXRlIH0gPVxuICAgIGdldERhdGVQaWNrZXJDb250ZXh0KHllYXJFbCk7XG4gIGNvbnN0IHNlbGVjdGVkWWVhciA9IHBhcnNlSW50KHllYXJFbC5pbm5lckhUTUwsIDEwKTtcbiAgbGV0IGRhdGUgPSBzZXRZZWFyKGNhbGVuZGFyRGF0ZSwgc2VsZWN0ZWRZZWFyKTtcbiAgZGF0ZSA9IGtlZXBEYXRlQmV0d2Vlbk1pbkFuZE1heChkYXRlLCBtaW5EYXRlLCBtYXhEYXRlKTtcbiAgY29uc3QgbmV3Q2FsZW5kYXIgPSByZW5kZXJDYWxlbmRhcihjYWxlbmRhckVsLCBkYXRlKTtcbiAgbmV3Q2FsZW5kYXIucXVlcnlTZWxlY3RvcihDQUxFTkRBUl9EQVRFX0ZPQ1VTRUQpLmZvY3VzKCk7XG59O1xuXG4vLyAjZW5kcmVnaW9uIENhbGVuZGFyIC0gWWVhciBTZWxlY3Rpb24gVmlld1xuXG4vLyAjcmVnaW9uIENhbGVuZGFyIEV2ZW50IEhhbmRsaW5nXG5cbi8qKlxuICogSGlkZSB0aGUgY2FsZW5kYXIuXG4gKlxuICogQHBhcmFtIHtLZXlib2FyZEV2ZW50fSBldmVudCB0aGUga2V5ZG93biBldmVudFxuICovXG5jb25zdCBoYW5kbGVFc2NhcGVGcm9tQ2FsZW5kYXIgPSAoZXZlbnQpID0+IHtcbiAgY29uc3QgeyBkYXRlUGlja2VyRWwsIGV4dGVybmFsSW5wdXRFbCB9ID0gZ2V0RGF0ZVBpY2tlckNvbnRleHQoZXZlbnQudGFyZ2V0KTtcblxuICBoaWRlQ2FsZW5kYXIoZGF0ZVBpY2tlckVsKTtcbiAgZXh0ZXJuYWxJbnB1dEVsLmZvY3VzKCk7XG5cbiAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbn07XG5cbi8vICNlbmRyZWdpb24gQ2FsZW5kYXIgRXZlbnQgSGFuZGxpbmdcblxuLy8gI3JlZ2lvbiBDYWxlbmRhciBEYXRlIEV2ZW50IEhhbmRsaW5nXG5cbi8qKlxuICogQWRqdXN0IHRoZSBkYXRlIGFuZCBkaXNwbGF5IHRoZSBjYWxlbmRhciBpZiBuZWVkZWQuXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gYWRqdXN0RGF0ZUZuIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGUgYWRqdXN0ZWQgZGF0ZVxuICovXG5jb25zdCBhZGp1c3RDYWxlbmRhciA9IChhZGp1c3REYXRlRm4pID0+IChldmVudCkgPT4ge1xuICBjb25zdCB7IGNhbGVuZGFyRWwsIGNhbGVuZGFyRGF0ZSwgbWluRGF0ZSwgbWF4RGF0ZSB9ID0gZ2V0RGF0ZVBpY2tlckNvbnRleHQoXG4gICAgZXZlbnQudGFyZ2V0XG4gICk7XG5cbiAgY29uc3QgZGF0ZSA9IGFkanVzdERhdGVGbihjYWxlbmRhckRhdGUpO1xuXG4gIGNvbnN0IGNhcHBlZERhdGUgPSBrZWVwRGF0ZUJldHdlZW5NaW5BbmRNYXgoZGF0ZSwgbWluRGF0ZSwgbWF4RGF0ZSk7XG4gIGlmICghaXNTYW1lRGF5KGNhbGVuZGFyRGF0ZSwgY2FwcGVkRGF0ZSkpIHtcbiAgICBjb25zdCBuZXdDYWxlbmRhciA9IHJlbmRlckNhbGVuZGFyKGNhbGVuZGFyRWwsIGNhcHBlZERhdGUpO1xuICAgIG5ld0NhbGVuZGFyLnF1ZXJ5U2VsZWN0b3IoQ0FMRU5EQVJfREFURV9GT0NVU0VEKS5mb2N1cygpO1xuICB9XG4gIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG59O1xuXG4vKipcbiAqIE5hdmlnYXRlIGJhY2sgb25lIHdlZWsgYW5kIGRpc3BsYXkgdGhlIGNhbGVuZGFyLlxuICpcbiAqIEBwYXJhbSB7S2V5Ym9hcmRFdmVudH0gZXZlbnQgdGhlIGtleWRvd24gZXZlbnRcbiAqL1xuY29uc3QgaGFuZGxlVXBGcm9tRGF0ZSA9IGFkanVzdENhbGVuZGFyKChkYXRlKSA9PiBzdWJXZWVrcyhkYXRlLCAxKSk7XG5cbi8qKlxuICogTmF2aWdhdGUgZm9yd2FyZCBvbmUgd2VlayBhbmQgZGlzcGxheSB0aGUgY2FsZW5kYXIuXG4gKlxuICogQHBhcmFtIHtLZXlib2FyZEV2ZW50fSBldmVudCB0aGUga2V5ZG93biBldmVudFxuICovXG5jb25zdCBoYW5kbGVEb3duRnJvbURhdGUgPSBhZGp1c3RDYWxlbmRhcigoZGF0ZSkgPT4gYWRkV2Vla3MoZGF0ZSwgMSkpO1xuXG4vKipcbiAqIE5hdmlnYXRlIGJhY2sgb25lIGRheSBhbmQgZGlzcGxheSB0aGUgY2FsZW5kYXIuXG4gKlxuICogQHBhcmFtIHtLZXlib2FyZEV2ZW50fSBldmVudCB0aGUga2V5ZG93biBldmVudFxuICovXG5jb25zdCBoYW5kbGVMZWZ0RnJvbURhdGUgPSBhZGp1c3RDYWxlbmRhcigoZGF0ZSkgPT4gc3ViRGF5cyhkYXRlLCAxKSk7XG5cbi8qKlxuICogTmF2aWdhdGUgZm9yd2FyZCBvbmUgZGF5IGFuZCBkaXNwbGF5IHRoZSBjYWxlbmRhci5cbiAqXG4gKiBAcGFyYW0ge0tleWJvYXJkRXZlbnR9IGV2ZW50IHRoZSBrZXlkb3duIGV2ZW50XG4gKi9cbmNvbnN0IGhhbmRsZVJpZ2h0RnJvbURhdGUgPSBhZGp1c3RDYWxlbmRhcigoZGF0ZSkgPT4gYWRkRGF5cyhkYXRlLCAxKSk7XG5cbi8qKlxuICogTmF2aWdhdGUgdG8gdGhlIHN0YXJ0IG9mIHRoZSB3ZWVrIGFuZCBkaXNwbGF5IHRoZSBjYWxlbmRhci5cbiAqXG4gKiBAcGFyYW0ge0tleWJvYXJkRXZlbnR9IGV2ZW50IHRoZSBrZXlkb3duIGV2ZW50XG4gKi9cbmNvbnN0IGhhbmRsZUhvbWVGcm9tRGF0ZSA9IGFkanVzdENhbGVuZGFyKChkYXRlKSA9PiBzdGFydE9mV2VlayhkYXRlKSk7XG5cbi8qKlxuICogTmF2aWdhdGUgdG8gdGhlIGVuZCBvZiB0aGUgd2VlayBhbmQgZGlzcGxheSB0aGUgY2FsZW5kYXIuXG4gKlxuICogQHBhcmFtIHtLZXlib2FyZEV2ZW50fSBldmVudCB0aGUga2V5ZG93biBldmVudFxuICovXG5jb25zdCBoYW5kbGVFbmRGcm9tRGF0ZSA9IGFkanVzdENhbGVuZGFyKChkYXRlKSA9PiBlbmRPZldlZWsoZGF0ZSkpO1xuXG4vKipcbiAqIE5hdmlnYXRlIGZvcndhcmQgb25lIG1vbnRoIGFuZCBkaXNwbGF5IHRoZSBjYWxlbmRhci5cbiAqXG4gKiBAcGFyYW0ge0tleWJvYXJkRXZlbnR9IGV2ZW50IHRoZSBrZXlkb3duIGV2ZW50XG4gKi9cbmNvbnN0IGhhbmRsZVBhZ2VEb3duRnJvbURhdGUgPSBhZGp1c3RDYWxlbmRhcigoZGF0ZSkgPT4gYWRkTW9udGhzKGRhdGUsIDEpKTtcblxuLyoqXG4gKiBOYXZpZ2F0ZSBiYWNrIG9uZSBtb250aCBhbmQgZGlzcGxheSB0aGUgY2FsZW5kYXIuXG4gKlxuICogQHBhcmFtIHtLZXlib2FyZEV2ZW50fSBldmVudCB0aGUga2V5ZG93biBldmVudFxuICovXG5jb25zdCBoYW5kbGVQYWdlVXBGcm9tRGF0ZSA9IGFkanVzdENhbGVuZGFyKChkYXRlKSA9PiBzdWJNb250aHMoZGF0ZSwgMSkpO1xuXG4vKipcbiAqIE5hdmlnYXRlIGZvcndhcmQgb25lIHllYXIgYW5kIGRpc3BsYXkgdGhlIGNhbGVuZGFyLlxuICpcbiAqIEBwYXJhbSB7S2V5Ym9hcmRFdmVudH0gZXZlbnQgdGhlIGtleWRvd24gZXZlbnRcbiAqL1xuY29uc3QgaGFuZGxlU2hpZnRQYWdlRG93bkZyb21EYXRlID0gYWRqdXN0Q2FsZW5kYXIoKGRhdGUpID0+IGFkZFllYXJzKGRhdGUsIDEpKTtcblxuLyoqXG4gKiBOYXZpZ2F0ZSBiYWNrIG9uZSB5ZWFyIGFuZCBkaXNwbGF5IHRoZSBjYWxlbmRhci5cbiAqXG4gKiBAcGFyYW0ge0tleWJvYXJkRXZlbnR9IGV2ZW50IHRoZSBrZXlkb3duIGV2ZW50XG4gKi9cbmNvbnN0IGhhbmRsZVNoaWZ0UGFnZVVwRnJvbURhdGUgPSBhZGp1c3RDYWxlbmRhcigoZGF0ZSkgPT4gc3ViWWVhcnMoZGF0ZSwgMSkpO1xuXG4vKipcbiAqIGRpc3BsYXkgdGhlIGNhbGVuZGFyIGZvciB0aGUgbW91c2VvdmVyIGRhdGUuXG4gKlxuICogQHBhcmFtIHtNb3VzZUV2ZW50fSBldmVudCBUaGUgbW91c2VvdmVyIGV2ZW50XG4gKiBAcGFyYW0ge0hUTUxCdXR0b25FbGVtZW50fSBkYXRlRWwgQSBkYXRlIGVsZW1lbnQgd2l0aGluIHRoZSBkYXRlIHBpY2tlciBjb21wb25lbnRcbiAqL1xuY29uc3QgaGFuZGxlTW91c2VvdmVyRnJvbURhdGUgPSAoZGF0ZUVsKSA9PiB7XG4gIGlmIChkYXRlRWwuZGlzYWJsZWQpIHJldHVybjtcblxuICBjb25zdCBjYWxlbmRhckVsID0gZGF0ZUVsLmNsb3Nlc3QoREFURV9QSUNLRVJfQ0FMRU5EQVIpO1xuXG4gIGNvbnN0IGN1cnJlbnRDYWxlbmRhckRhdGUgPSBjYWxlbmRhckVsLmRhdGFzZXQudmFsdWU7XG4gIGNvbnN0IGhvdmVyRGF0ZSA9IGRhdGVFbC5kYXRhc2V0LnZhbHVlO1xuXG4gIGlmIChob3ZlckRhdGUgPT09IGN1cnJlbnRDYWxlbmRhckRhdGUpIHJldHVybjtcblxuICBjb25zdCBkYXRlVG9EaXNwbGF5ID0gcGFyc2VEYXRlU3RyaW5nKGhvdmVyRGF0ZSk7XG4gIGNvbnN0IG5ld0NhbGVuZGFyID0gcmVuZGVyQ2FsZW5kYXIoY2FsZW5kYXJFbCwgZGF0ZVRvRGlzcGxheSk7XG4gIG5ld0NhbGVuZGFyLnF1ZXJ5U2VsZWN0b3IoQ0FMRU5EQVJfREFURV9GT0NVU0VEKS5mb2N1cygpO1xufTtcblxuLy8gI2VuZHJlZ2lvbiBDYWxlbmRhciBEYXRlIEV2ZW50IEhhbmRsaW5nXG5cbi8vICNyZWdpb24gQ2FsZW5kYXIgTW9udGggRXZlbnQgSGFuZGxpbmdcblxuLyoqXG4gKiBBZGp1c3QgdGhlIG1vbnRoIGFuZCBkaXNwbGF5IHRoZSBtb250aCBzZWxlY3Rpb24gc2NyZWVuIGlmIG5lZWRlZC5cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBhZGp1c3RNb250aEZuIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGUgYWRqdXN0ZWQgbW9udGhcbiAqL1xuY29uc3QgYWRqdXN0TW9udGhTZWxlY3Rpb25TY3JlZW4gPSAoYWRqdXN0TW9udGhGbikgPT4gKGV2ZW50KSA9PiB7XG4gIGNvbnN0IG1vbnRoRWwgPSBldmVudC50YXJnZXQ7XG4gIGNvbnN0IHNlbGVjdGVkTW9udGggPSBwYXJzZUludChtb250aEVsLmRhdGFzZXQudmFsdWUsIDEwKTtcbiAgY29uc3QgeyBjYWxlbmRhckVsLCBjYWxlbmRhckRhdGUsIG1pbkRhdGUsIG1heERhdGUgfSA9XG4gICAgZ2V0RGF0ZVBpY2tlckNvbnRleHQobW9udGhFbCk7XG4gIGNvbnN0IGN1cnJlbnREYXRlID0gc2V0TW9udGgoY2FsZW5kYXJEYXRlLCBzZWxlY3RlZE1vbnRoKTtcblxuICBsZXQgYWRqdXN0ZWRNb250aCA9IGFkanVzdE1vbnRoRm4oc2VsZWN0ZWRNb250aCk7XG4gIGFkanVzdGVkTW9udGggPSBNYXRoLm1heCgwLCBNYXRoLm1pbigxMSwgYWRqdXN0ZWRNb250aCkpO1xuXG4gIGNvbnN0IGRhdGUgPSBzZXRNb250aChjYWxlbmRhckRhdGUsIGFkanVzdGVkTW9udGgpO1xuICBjb25zdCBjYXBwZWREYXRlID0ga2VlcERhdGVCZXR3ZWVuTWluQW5kTWF4KGRhdGUsIG1pbkRhdGUsIG1heERhdGUpO1xuICBpZiAoIWlzU2FtZU1vbnRoKGN1cnJlbnREYXRlLCBjYXBwZWREYXRlKSkge1xuICAgIGNvbnN0IG5ld0NhbGVuZGFyID0gZGlzcGxheU1vbnRoU2VsZWN0aW9uKFxuICAgICAgY2FsZW5kYXJFbCxcbiAgICAgIGNhcHBlZERhdGUuZ2V0TW9udGgoKVxuICAgICk7XG4gICAgbmV3Q2FsZW5kYXIucXVlcnlTZWxlY3RvcihDQUxFTkRBUl9NT05USF9GT0NVU0VEKS5mb2N1cygpO1xuICB9XG4gIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG59O1xuXG4vKipcbiAqIE5hdmlnYXRlIGJhY2sgdGhyZWUgbW9udGhzIGFuZCBkaXNwbGF5IHRoZSBtb250aCBzZWxlY3Rpb24gc2NyZWVuLlxuICpcbiAqIEBwYXJhbSB7S2V5Ym9hcmRFdmVudH0gZXZlbnQgdGhlIGtleWRvd24gZXZlbnRcbiAqL1xuY29uc3QgaGFuZGxlVXBGcm9tTW9udGggPSBhZGp1c3RNb250aFNlbGVjdGlvblNjcmVlbigobW9udGgpID0+IG1vbnRoIC0gMyk7XG5cbi8qKlxuICogTmF2aWdhdGUgZm9yd2FyZCB0aHJlZSBtb250aHMgYW5kIGRpc3BsYXkgdGhlIG1vbnRoIHNlbGVjdGlvbiBzY3JlZW4uXG4gKlxuICogQHBhcmFtIHtLZXlib2FyZEV2ZW50fSBldmVudCB0aGUga2V5ZG93biBldmVudFxuICovXG5jb25zdCBoYW5kbGVEb3duRnJvbU1vbnRoID0gYWRqdXN0TW9udGhTZWxlY3Rpb25TY3JlZW4oKG1vbnRoKSA9PiBtb250aCArIDMpO1xuXG4vKipcbiAqIE5hdmlnYXRlIGJhY2sgb25lIG1vbnRoIGFuZCBkaXNwbGF5IHRoZSBtb250aCBzZWxlY3Rpb24gc2NyZWVuLlxuICpcbiAqIEBwYXJhbSB7S2V5Ym9hcmRFdmVudH0gZXZlbnQgdGhlIGtleWRvd24gZXZlbnRcbiAqL1xuY29uc3QgaGFuZGxlTGVmdEZyb21Nb250aCA9IGFkanVzdE1vbnRoU2VsZWN0aW9uU2NyZWVuKChtb250aCkgPT4gbW9udGggLSAxKTtcblxuLyoqXG4gKiBOYXZpZ2F0ZSBmb3J3YXJkIG9uZSBtb250aCBhbmQgZGlzcGxheSB0aGUgbW9udGggc2VsZWN0aW9uIHNjcmVlbi5cbiAqXG4gKiBAcGFyYW0ge0tleWJvYXJkRXZlbnR9IGV2ZW50IHRoZSBrZXlkb3duIGV2ZW50XG4gKi9cbmNvbnN0IGhhbmRsZVJpZ2h0RnJvbU1vbnRoID0gYWRqdXN0TW9udGhTZWxlY3Rpb25TY3JlZW4oKG1vbnRoKSA9PiBtb250aCArIDEpO1xuXG4vKipcbiAqIE5hdmlnYXRlIHRvIHRoZSBzdGFydCBvZiB0aGUgcm93IG9mIG1vbnRocyBhbmQgZGlzcGxheSB0aGUgbW9udGggc2VsZWN0aW9uIHNjcmVlbi5cbiAqXG4gKiBAcGFyYW0ge0tleWJvYXJkRXZlbnR9IGV2ZW50IHRoZSBrZXlkb3duIGV2ZW50XG4gKi9cbmNvbnN0IGhhbmRsZUhvbWVGcm9tTW9udGggPSBhZGp1c3RNb250aFNlbGVjdGlvblNjcmVlbihcbiAgKG1vbnRoKSA9PiBtb250aCAtIChtb250aCAlIDMpXG4pO1xuXG4vKipcbiAqIE5hdmlnYXRlIHRvIHRoZSBlbmQgb2YgdGhlIHJvdyBvZiBtb250aHMgYW5kIGRpc3BsYXkgdGhlIG1vbnRoIHNlbGVjdGlvbiBzY3JlZW4uXG4gKlxuICogQHBhcmFtIHtLZXlib2FyZEV2ZW50fSBldmVudCB0aGUga2V5ZG93biBldmVudFxuICovXG5jb25zdCBoYW5kbGVFbmRGcm9tTW9udGggPSBhZGp1c3RNb250aFNlbGVjdGlvblNjcmVlbihcbiAgKG1vbnRoKSA9PiBtb250aCArIDIgLSAobW9udGggJSAzKVxuKTtcblxuLyoqXG4gKiBOYXZpZ2F0ZSB0byB0aGUgbGFzdCBtb250aCAoRGVjZW1iZXIpIGFuZCBkaXNwbGF5IHRoZSBtb250aCBzZWxlY3Rpb24gc2NyZWVuLlxuICpcbiAqIEBwYXJhbSB7S2V5Ym9hcmRFdmVudH0gZXZlbnQgdGhlIGtleWRvd24gZXZlbnRcbiAqL1xuY29uc3QgaGFuZGxlUGFnZURvd25Gcm9tTW9udGggPSBhZGp1c3RNb250aFNlbGVjdGlvblNjcmVlbigoKSA9PiAxMSk7XG5cbi8qKlxuICogTmF2aWdhdGUgdG8gdGhlIGZpcnN0IG1vbnRoIChKYW51YXJ5KSBhbmQgZGlzcGxheSB0aGUgbW9udGggc2VsZWN0aW9uIHNjcmVlbi5cbiAqXG4gKiBAcGFyYW0ge0tleWJvYXJkRXZlbnR9IGV2ZW50IHRoZSBrZXlkb3duIGV2ZW50XG4gKi9cbmNvbnN0IGhhbmRsZVBhZ2VVcEZyb21Nb250aCA9IGFkanVzdE1vbnRoU2VsZWN0aW9uU2NyZWVuKCgpID0+IDApO1xuXG4vKipcbiAqIHVwZGF0ZSB0aGUgZm9jdXMgb24gYSBtb250aCB3aGVuIHRoZSBtb3VzZSBtb3Zlcy5cbiAqXG4gKiBAcGFyYW0ge01vdXNlRXZlbnR9IGV2ZW50IFRoZSBtb3VzZW92ZXIgZXZlbnRcbiAqIEBwYXJhbSB7SFRNTEJ1dHRvbkVsZW1lbnR9IG1vbnRoRWwgQSBtb250aCBlbGVtZW50IHdpdGhpbiB0aGUgZGF0ZSBwaWNrZXIgY29tcG9uZW50XG4gKi9cbmNvbnN0IGhhbmRsZU1vdXNlb3ZlckZyb21Nb250aCA9IChtb250aEVsKSA9PiB7XG4gIGlmIChtb250aEVsLmRpc2FibGVkKSByZXR1cm47XG4gIGlmIChtb250aEVsLmNsYXNzTGlzdC5jb250YWlucyhDQUxFTkRBUl9NT05USF9GT0NVU0VEX0NMQVNTKSkgcmV0dXJuO1xuXG4gIGNvbnN0IGZvY3VzTW9udGggPSBwYXJzZUludChtb250aEVsLmRhdGFzZXQudmFsdWUsIDEwKTtcblxuICBjb25zdCBuZXdDYWxlbmRhciA9IGRpc3BsYXlNb250aFNlbGVjdGlvbihtb250aEVsLCBmb2N1c01vbnRoKTtcbiAgbmV3Q2FsZW5kYXIucXVlcnlTZWxlY3RvcihDQUxFTkRBUl9NT05USF9GT0NVU0VEKS5mb2N1cygpO1xufTtcblxuLy8gI2VuZHJlZ2lvbiBDYWxlbmRhciBNb250aCBFdmVudCBIYW5kbGluZ1xuXG4vLyAjcmVnaW9uIENhbGVuZGFyIFllYXIgRXZlbnQgSGFuZGxpbmdcblxuLyoqXG4gKiBBZGp1c3QgdGhlIHllYXIgYW5kIGRpc3BsYXkgdGhlIHllYXIgc2VsZWN0aW9uIHNjcmVlbiBpZiBuZWVkZWQuXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gYWRqdXN0WWVhckZuIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGUgYWRqdXN0ZWQgeWVhclxuICovXG5jb25zdCBhZGp1c3RZZWFyU2VsZWN0aW9uU2NyZWVuID0gKGFkanVzdFllYXJGbikgPT4gKGV2ZW50KSA9PiB7XG4gIGNvbnN0IHllYXJFbCA9IGV2ZW50LnRhcmdldDtcbiAgY29uc3Qgc2VsZWN0ZWRZZWFyID0gcGFyc2VJbnQoeWVhckVsLmRhdGFzZXQudmFsdWUsIDEwKTtcbiAgY29uc3QgeyBjYWxlbmRhckVsLCBjYWxlbmRhckRhdGUsIG1pbkRhdGUsIG1heERhdGUgfSA9XG4gICAgZ2V0RGF0ZVBpY2tlckNvbnRleHQoeWVhckVsKTtcbiAgY29uc3QgY3VycmVudERhdGUgPSBzZXRZZWFyKGNhbGVuZGFyRGF0ZSwgc2VsZWN0ZWRZZWFyKTtcblxuICBsZXQgYWRqdXN0ZWRZZWFyID0gYWRqdXN0WWVhckZuKHNlbGVjdGVkWWVhcik7XG4gIGFkanVzdGVkWWVhciA9IE1hdGgubWF4KDAsIGFkanVzdGVkWWVhcik7XG5cbiAgY29uc3QgZGF0ZSA9IHNldFllYXIoY2FsZW5kYXJEYXRlLCBhZGp1c3RlZFllYXIpO1xuICBjb25zdCBjYXBwZWREYXRlID0ga2VlcERhdGVCZXR3ZWVuTWluQW5kTWF4KGRhdGUsIG1pbkRhdGUsIG1heERhdGUpO1xuICBpZiAoIWlzU2FtZVllYXIoY3VycmVudERhdGUsIGNhcHBlZERhdGUpKSB7XG4gICAgY29uc3QgbmV3Q2FsZW5kYXIgPSBkaXNwbGF5WWVhclNlbGVjdGlvbihcbiAgICAgIGNhbGVuZGFyRWwsXG4gICAgICBjYXBwZWREYXRlLmdldEZ1bGxZZWFyKClcbiAgICApO1xuICAgIG5ld0NhbGVuZGFyLnF1ZXJ5U2VsZWN0b3IoQ0FMRU5EQVJfWUVBUl9GT0NVU0VEKS5mb2N1cygpO1xuICB9XG4gIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG59O1xuXG4vKipcbiAqIE5hdmlnYXRlIGJhY2sgdGhyZWUgeWVhcnMgYW5kIGRpc3BsYXkgdGhlIHllYXIgc2VsZWN0aW9uIHNjcmVlbi5cbiAqXG4gKiBAcGFyYW0ge0tleWJvYXJkRXZlbnR9IGV2ZW50IHRoZSBrZXlkb3duIGV2ZW50XG4gKi9cbmNvbnN0IGhhbmRsZVVwRnJvbVllYXIgPSBhZGp1c3RZZWFyU2VsZWN0aW9uU2NyZWVuKCh5ZWFyKSA9PiB5ZWFyIC0gMyk7XG5cbi8qKlxuICogTmF2aWdhdGUgZm9yd2FyZCB0aHJlZSB5ZWFycyBhbmQgZGlzcGxheSB0aGUgeWVhciBzZWxlY3Rpb24gc2NyZWVuLlxuICpcbiAqIEBwYXJhbSB7S2V5Ym9hcmRFdmVudH0gZXZlbnQgdGhlIGtleWRvd24gZXZlbnRcbiAqL1xuY29uc3QgaGFuZGxlRG93bkZyb21ZZWFyID0gYWRqdXN0WWVhclNlbGVjdGlvblNjcmVlbigoeWVhcikgPT4geWVhciArIDMpO1xuXG4vKipcbiAqIE5hdmlnYXRlIGJhY2sgb25lIHllYXIgYW5kIGRpc3BsYXkgdGhlIHllYXIgc2VsZWN0aW9uIHNjcmVlbi5cbiAqXG4gKiBAcGFyYW0ge0tleWJvYXJkRXZlbnR9IGV2ZW50IHRoZSBrZXlkb3duIGV2ZW50XG4gKi9cbmNvbnN0IGhhbmRsZUxlZnRGcm9tWWVhciA9IGFkanVzdFllYXJTZWxlY3Rpb25TY3JlZW4oKHllYXIpID0+IHllYXIgLSAxKTtcblxuLyoqXG4gKiBOYXZpZ2F0ZSBmb3J3YXJkIG9uZSB5ZWFyIGFuZCBkaXNwbGF5IHRoZSB5ZWFyIHNlbGVjdGlvbiBzY3JlZW4uXG4gKlxuICogQHBhcmFtIHtLZXlib2FyZEV2ZW50fSBldmVudCB0aGUga2V5ZG93biBldmVudFxuICovXG5jb25zdCBoYW5kbGVSaWdodEZyb21ZZWFyID0gYWRqdXN0WWVhclNlbGVjdGlvblNjcmVlbigoeWVhcikgPT4geWVhciArIDEpO1xuXG4vKipcbiAqIE5hdmlnYXRlIHRvIHRoZSBzdGFydCBvZiB0aGUgcm93IG9mIHllYXJzIGFuZCBkaXNwbGF5IHRoZSB5ZWFyIHNlbGVjdGlvbiBzY3JlZW4uXG4gKlxuICogQHBhcmFtIHtLZXlib2FyZEV2ZW50fSBldmVudCB0aGUga2V5ZG93biBldmVudFxuICovXG5jb25zdCBoYW5kbGVIb21lRnJvbVllYXIgPSBhZGp1c3RZZWFyU2VsZWN0aW9uU2NyZWVuKFxuICAoeWVhcikgPT4geWVhciAtICh5ZWFyICUgMylcbik7XG5cbi8qKlxuICogTmF2aWdhdGUgdG8gdGhlIGVuZCBvZiB0aGUgcm93IG9mIHllYXJzIGFuZCBkaXNwbGF5IHRoZSB5ZWFyIHNlbGVjdGlvbiBzY3JlZW4uXG4gKlxuICogQHBhcmFtIHtLZXlib2FyZEV2ZW50fSBldmVudCB0aGUga2V5ZG93biBldmVudFxuICovXG5jb25zdCBoYW5kbGVFbmRGcm9tWWVhciA9IGFkanVzdFllYXJTZWxlY3Rpb25TY3JlZW4oXG4gICh5ZWFyKSA9PiB5ZWFyICsgMiAtICh5ZWFyICUgMylcbik7XG5cbi8qKlxuICogTmF2aWdhdGUgdG8gYmFjayAxMiB5ZWFycyBhbmQgZGlzcGxheSB0aGUgeWVhciBzZWxlY3Rpb24gc2NyZWVuLlxuICpcbiAqIEBwYXJhbSB7S2V5Ym9hcmRFdmVudH0gZXZlbnQgdGhlIGtleWRvd24gZXZlbnRcbiAqL1xuY29uc3QgaGFuZGxlUGFnZVVwRnJvbVllYXIgPSBhZGp1c3RZZWFyU2VsZWN0aW9uU2NyZWVuKFxuICAoeWVhcikgPT4geWVhciAtIFlFQVJfQ0hVTktcbik7XG5cbi8qKlxuICogTmF2aWdhdGUgZm9yd2FyZCAxMiB5ZWFycyBhbmQgZGlzcGxheSB0aGUgeWVhciBzZWxlY3Rpb24gc2NyZWVuLlxuICpcbiAqIEBwYXJhbSB7S2V5Ym9hcmRFdmVudH0gZXZlbnQgdGhlIGtleWRvd24gZXZlbnRcbiAqL1xuY29uc3QgaGFuZGxlUGFnZURvd25Gcm9tWWVhciA9IGFkanVzdFllYXJTZWxlY3Rpb25TY3JlZW4oXG4gICh5ZWFyKSA9PiB5ZWFyICsgWUVBUl9DSFVOS1xuKTtcblxuLyoqXG4gKiB1cGRhdGUgdGhlIGZvY3VzIG9uIGEgeWVhciB3aGVuIHRoZSBtb3VzZSBtb3Zlcy5cbiAqXG4gKiBAcGFyYW0ge01vdXNlRXZlbnR9IGV2ZW50IFRoZSBtb3VzZW92ZXIgZXZlbnRcbiAqIEBwYXJhbSB7SFRNTEJ1dHRvbkVsZW1lbnR9IGRhdGVFbCBBIHllYXIgZWxlbWVudCB3aXRoaW4gdGhlIGRhdGUgcGlja2VyIGNvbXBvbmVudFxuICovXG5jb25zdCBoYW5kbGVNb3VzZW92ZXJGcm9tWWVhciA9ICh5ZWFyRWwpID0+IHtcbiAgaWYgKHllYXJFbC5kaXNhYmxlZCkgcmV0dXJuO1xuICBpZiAoeWVhckVsLmNsYXNzTGlzdC5jb250YWlucyhDQUxFTkRBUl9ZRUFSX0ZPQ1VTRURfQ0xBU1MpKSByZXR1cm47XG5cbiAgY29uc3QgZm9jdXNZZWFyID0gcGFyc2VJbnQoeWVhckVsLmRhdGFzZXQudmFsdWUsIDEwKTtcblxuICBjb25zdCBuZXdDYWxlbmRhciA9IGRpc3BsYXlZZWFyU2VsZWN0aW9uKHllYXJFbCwgZm9jdXNZZWFyKTtcbiAgbmV3Q2FsZW5kYXIucXVlcnlTZWxlY3RvcihDQUxFTkRBUl9ZRUFSX0ZPQ1VTRUQpLmZvY3VzKCk7XG59O1xuXG4vLyAjZW5kcmVnaW9uIENhbGVuZGFyIFllYXIgRXZlbnQgSGFuZGxpbmdcblxuLy8gI3JlZ2lvbiBGb2N1cyBIYW5kbGluZyBFdmVudCBIYW5kbGluZ1xuXG5jb25zdCB0YWJIYW5kbGVyID0gKGZvY3VzYWJsZSkgPT4ge1xuICBjb25zdCBnZXRGb2N1c2FibGVDb250ZXh0ID0gKGVsKSA9PiB7XG4gICAgY29uc3QgeyBjYWxlbmRhckVsIH0gPSBnZXREYXRlUGlja2VyQ29udGV4dChlbCk7XG4gICAgY29uc3QgZm9jdXNhYmxlRWxlbWVudHMgPSBzZWxlY3QoZm9jdXNhYmxlLCBjYWxlbmRhckVsKTtcblxuICAgIGNvbnN0IGZpcnN0VGFiSW5kZXggPSAwO1xuICAgIGNvbnN0IGxhc3RUYWJJbmRleCA9IGZvY3VzYWJsZUVsZW1lbnRzLmxlbmd0aCAtIDE7XG4gICAgY29uc3QgZmlyc3RUYWJTdG9wID0gZm9jdXNhYmxlRWxlbWVudHNbZmlyc3RUYWJJbmRleF07XG4gICAgY29uc3QgbGFzdFRhYlN0b3AgPSBmb2N1c2FibGVFbGVtZW50c1tsYXN0VGFiSW5kZXhdO1xuICAgIGNvbnN0IGZvY3VzSW5kZXggPSBmb2N1c2FibGVFbGVtZW50cy5pbmRleE9mKGFjdGl2ZUVsZW1lbnQoKSk7XG5cbiAgICBjb25zdCBpc0xhc3RUYWIgPSBmb2N1c0luZGV4ID09PSBsYXN0VGFiSW5kZXg7XG4gICAgY29uc3QgaXNGaXJzdFRhYiA9IGZvY3VzSW5kZXggPT09IGZpcnN0VGFiSW5kZXg7XG4gICAgY29uc3QgaXNOb3RGb3VuZCA9IGZvY3VzSW5kZXggPT09IC0xO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGZvY3VzYWJsZUVsZW1lbnRzLFxuICAgICAgaXNOb3RGb3VuZCxcbiAgICAgIGZpcnN0VGFiU3RvcCxcbiAgICAgIGlzRmlyc3RUYWIsXG4gICAgICBsYXN0VGFiU3RvcCxcbiAgICAgIGlzTGFzdFRhYixcbiAgICB9O1xuICB9O1xuXG4gIHJldHVybiB7XG4gICAgdGFiQWhlYWQoZXZlbnQpIHtcbiAgICAgIGNvbnN0IHsgZmlyc3RUYWJTdG9wLCBpc0xhc3RUYWIsIGlzTm90Rm91bmQgfSA9IGdldEZvY3VzYWJsZUNvbnRleHQoXG4gICAgICAgIGV2ZW50LnRhcmdldFxuICAgICAgKTtcblxuICAgICAgaWYgKGlzTGFzdFRhYiB8fCBpc05vdEZvdW5kKSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGZpcnN0VGFiU3RvcC5mb2N1cygpO1xuICAgICAgfVxuICAgIH0sXG4gICAgdGFiQmFjayhldmVudCkge1xuICAgICAgY29uc3QgeyBsYXN0VGFiU3RvcCwgaXNGaXJzdFRhYiwgaXNOb3RGb3VuZCB9ID0gZ2V0Rm9jdXNhYmxlQ29udGV4dChcbiAgICAgICAgZXZlbnQudGFyZ2V0XG4gICAgICApO1xuXG4gICAgICBpZiAoaXNGaXJzdFRhYiB8fCBpc05vdEZvdW5kKSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGxhc3RUYWJTdG9wLmZvY3VzKCk7XG4gICAgICB9XG4gICAgfSxcbiAgfTtcbn07XG5cbmNvbnN0IGRhdGVQaWNrZXJUYWJFdmVudEhhbmRsZXIgPSB0YWJIYW5kbGVyKERBVEVfUElDS0VSX0ZPQ1VTQUJMRSk7XG5jb25zdCBtb250aFBpY2tlclRhYkV2ZW50SGFuZGxlciA9IHRhYkhhbmRsZXIoTU9OVEhfUElDS0VSX0ZPQ1VTQUJMRSk7XG5jb25zdCB5ZWFyUGlja2VyVGFiRXZlbnRIYW5kbGVyID0gdGFiSGFuZGxlcihZRUFSX1BJQ0tFUl9GT0NVU0FCTEUpO1xuXG4vLyAjZW5kcmVnaW9uIEZvY3VzIEhhbmRsaW5nIEV2ZW50IEhhbmRsaW5nXG5cbi8vICNyZWdpb24gRGF0ZSBQaWNrZXIgRXZlbnQgRGVsZWdhdGlvbiBSZWdpc3RyYXRpb24gLyBDb21wb25lbnRcblxuY29uc3QgZGF0ZVBpY2tlckV2ZW50cyA9IHtcbiAgW0NMSUNLXToge1xuICAgIFtEQVRFX1BJQ0tFUl9CVVRUT05dKCkge1xuICAgICAgdG9nZ2xlQ2FsZW5kYXIodGhpcyk7XG4gICAgfSxcbiAgICBbQ0FMRU5EQVJfREFURV0oKSB7XG4gICAgICBzZWxlY3REYXRlKHRoaXMpO1xuICAgIH0sXG4gICAgW0NBTEVOREFSX01PTlRIXSgpIHtcbiAgICAgIHNlbGVjdE1vbnRoKHRoaXMpO1xuICAgIH0sXG4gICAgW0NBTEVOREFSX1lFQVJdKCkge1xuICAgICAgc2VsZWN0WWVhcih0aGlzKTtcbiAgICB9LFxuICAgIFtDQUxFTkRBUl9QUkVWSU9VU19NT05USF0oKSB7XG4gICAgICBkaXNwbGF5UHJldmlvdXNNb250aCh0aGlzKTtcbiAgICB9LFxuICAgIFtDQUxFTkRBUl9ORVhUX01PTlRIXSgpIHtcbiAgICAgIGRpc3BsYXlOZXh0TW9udGgodGhpcyk7XG4gICAgfSxcbiAgICBbQ0FMRU5EQVJfUFJFVklPVVNfWUVBUl0oKSB7XG4gICAgICBkaXNwbGF5UHJldmlvdXNZZWFyKHRoaXMpO1xuICAgIH0sXG4gICAgW0NBTEVOREFSX05FWFRfWUVBUl0oKSB7XG4gICAgICBkaXNwbGF5TmV4dFllYXIodGhpcyk7XG4gICAgfSxcbiAgICBbQ0FMRU5EQVJfUFJFVklPVVNfWUVBUl9DSFVOS10oKSB7XG4gICAgICBkaXNwbGF5UHJldmlvdXNZZWFyQ2h1bmsodGhpcyk7XG4gICAgfSxcbiAgICBbQ0FMRU5EQVJfTkVYVF9ZRUFSX0NIVU5LXSgpIHtcbiAgICAgIGRpc3BsYXlOZXh0WWVhckNodW5rKHRoaXMpO1xuICAgIH0sXG4gICAgW0NBTEVOREFSX01PTlRIX1NFTEVDVElPTl0oKSB7XG4gICAgICBjb25zdCBuZXdDYWxlbmRhciA9IGRpc3BsYXlNb250aFNlbGVjdGlvbih0aGlzKTtcbiAgICAgIG5ld0NhbGVuZGFyLnF1ZXJ5U2VsZWN0b3IoQ0FMRU5EQVJfTU9OVEhfRk9DVVNFRCkuZm9jdXMoKTtcbiAgICB9LFxuICAgIFtDQUxFTkRBUl9ZRUFSX1NFTEVDVElPTl0oKSB7XG4gICAgICBjb25zdCBuZXdDYWxlbmRhciA9IGRpc3BsYXlZZWFyU2VsZWN0aW9uKHRoaXMpO1xuICAgICAgbmV3Q2FsZW5kYXIucXVlcnlTZWxlY3RvcihDQUxFTkRBUl9ZRUFSX0ZPQ1VTRUQpLmZvY3VzKCk7XG4gICAgfSxcbiAgfSxcbiAga2V5dXA6IHtcbiAgICBbREFURV9QSUNLRVJfQ0FMRU5EQVJdKGV2ZW50KSB7XG4gICAgICBjb25zdCBrZXlkb3duID0gdGhpcy5kYXRhc2V0LmtleWRvd25LZXlDb2RlO1xuICAgICAgaWYgKGAke2V2ZW50LmtleUNvZGV9YCAhPT0ga2V5ZG93bikge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgfVxuICAgIH0sXG4gIH0sXG4gIGtleWRvd246IHtcbiAgICBbREFURV9QSUNLRVJfRVhURVJOQUxfSU5QVVRdKGV2ZW50KSB7XG4gICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gRU5URVJfS0VZQ09ERSkge1xuICAgICAgICB2YWxpZGF0ZURhdGVJbnB1dCh0aGlzKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIFtDQUxFTkRBUl9EQVRFXToga2V5bWFwKHtcbiAgICAgIFVwOiBoYW5kbGVVcEZyb21EYXRlLFxuICAgICAgQXJyb3dVcDogaGFuZGxlVXBGcm9tRGF0ZSxcbiAgICAgIERvd246IGhhbmRsZURvd25Gcm9tRGF0ZSxcbiAgICAgIEFycm93RG93bjogaGFuZGxlRG93bkZyb21EYXRlLFxuICAgICAgTGVmdDogaGFuZGxlTGVmdEZyb21EYXRlLFxuICAgICAgQXJyb3dMZWZ0OiBoYW5kbGVMZWZ0RnJvbURhdGUsXG4gICAgICBSaWdodDogaGFuZGxlUmlnaHRGcm9tRGF0ZSxcbiAgICAgIEFycm93UmlnaHQ6IGhhbmRsZVJpZ2h0RnJvbURhdGUsXG4gICAgICBIb21lOiBoYW5kbGVIb21lRnJvbURhdGUsXG4gICAgICBFbmQ6IGhhbmRsZUVuZEZyb21EYXRlLFxuICAgICAgUGFnZURvd246IGhhbmRsZVBhZ2VEb3duRnJvbURhdGUsXG4gICAgICBQYWdlVXA6IGhhbmRsZVBhZ2VVcEZyb21EYXRlLFxuICAgICAgXCJTaGlmdCtQYWdlRG93blwiOiBoYW5kbGVTaGlmdFBhZ2VEb3duRnJvbURhdGUsXG4gICAgICBcIlNoaWZ0K1BhZ2VVcFwiOiBoYW5kbGVTaGlmdFBhZ2VVcEZyb21EYXRlLFxuICAgICAgVGFiOiBkYXRlUGlja2VyVGFiRXZlbnRIYW5kbGVyLnRhYkFoZWFkLFxuICAgIH0pLFxuICAgIFtDQUxFTkRBUl9EQVRFX1BJQ0tFUl06IGtleW1hcCh7XG4gICAgICBUYWI6IGRhdGVQaWNrZXJUYWJFdmVudEhhbmRsZXIudGFiQWhlYWQsXG4gICAgICBcIlNoaWZ0K1RhYlwiOiBkYXRlUGlja2VyVGFiRXZlbnRIYW5kbGVyLnRhYkJhY2ssXG4gICAgfSksXG4gICAgW0NBTEVOREFSX01PTlRIXToga2V5bWFwKHtcbiAgICAgIFVwOiBoYW5kbGVVcEZyb21Nb250aCxcbiAgICAgIEFycm93VXA6IGhhbmRsZVVwRnJvbU1vbnRoLFxuICAgICAgRG93bjogaGFuZGxlRG93bkZyb21Nb250aCxcbiAgICAgIEFycm93RG93bjogaGFuZGxlRG93bkZyb21Nb250aCxcbiAgICAgIExlZnQ6IGhhbmRsZUxlZnRGcm9tTW9udGgsXG4gICAgICBBcnJvd0xlZnQ6IGhhbmRsZUxlZnRGcm9tTW9udGgsXG4gICAgICBSaWdodDogaGFuZGxlUmlnaHRGcm9tTW9udGgsXG4gICAgICBBcnJvd1JpZ2h0OiBoYW5kbGVSaWdodEZyb21Nb250aCxcbiAgICAgIEhvbWU6IGhhbmRsZUhvbWVGcm9tTW9udGgsXG4gICAgICBFbmQ6IGhhbmRsZUVuZEZyb21Nb250aCxcbiAgICAgIFBhZ2VEb3duOiBoYW5kbGVQYWdlRG93bkZyb21Nb250aCxcbiAgICAgIFBhZ2VVcDogaGFuZGxlUGFnZVVwRnJvbU1vbnRoLFxuICAgIH0pLFxuICAgIFtDQUxFTkRBUl9NT05USF9QSUNLRVJdOiBrZXltYXAoe1xuICAgICAgVGFiOiBtb250aFBpY2tlclRhYkV2ZW50SGFuZGxlci50YWJBaGVhZCxcbiAgICAgIFwiU2hpZnQrVGFiXCI6IG1vbnRoUGlja2VyVGFiRXZlbnRIYW5kbGVyLnRhYkJhY2ssXG4gICAgfSksXG4gICAgW0NBTEVOREFSX1lFQVJdOiBrZXltYXAoe1xuICAgICAgVXA6IGhhbmRsZVVwRnJvbVllYXIsXG4gICAgICBBcnJvd1VwOiBoYW5kbGVVcEZyb21ZZWFyLFxuICAgICAgRG93bjogaGFuZGxlRG93bkZyb21ZZWFyLFxuICAgICAgQXJyb3dEb3duOiBoYW5kbGVEb3duRnJvbVllYXIsXG4gICAgICBMZWZ0OiBoYW5kbGVMZWZ0RnJvbVllYXIsXG4gICAgICBBcnJvd0xlZnQ6IGhhbmRsZUxlZnRGcm9tWWVhcixcbiAgICAgIFJpZ2h0OiBoYW5kbGVSaWdodEZyb21ZZWFyLFxuICAgICAgQXJyb3dSaWdodDogaGFuZGxlUmlnaHRGcm9tWWVhcixcbiAgICAgIEhvbWU6IGhhbmRsZUhvbWVGcm9tWWVhcixcbiAgICAgIEVuZDogaGFuZGxlRW5kRnJvbVllYXIsXG4gICAgICBQYWdlRG93bjogaGFuZGxlUGFnZURvd25Gcm9tWWVhcixcbiAgICAgIFBhZ2VVcDogaGFuZGxlUGFnZVVwRnJvbVllYXIsXG4gICAgfSksXG4gICAgW0NBTEVOREFSX1lFQVJfUElDS0VSXToga2V5bWFwKHtcbiAgICAgIFRhYjogeWVhclBpY2tlclRhYkV2ZW50SGFuZGxlci50YWJBaGVhZCxcbiAgICAgIFwiU2hpZnQrVGFiXCI6IHllYXJQaWNrZXJUYWJFdmVudEhhbmRsZXIudGFiQmFjayxcbiAgICB9KSxcbiAgICBbREFURV9QSUNLRVJfQ0FMRU5EQVJdKGV2ZW50KSB7XG4gICAgICB0aGlzLmRhdGFzZXQua2V5ZG93bktleUNvZGUgPSBldmVudC5rZXlDb2RlO1xuICAgIH0sXG4gICAgW0RBVEVfUElDS0VSXShldmVudCkge1xuICAgICAgY29uc3Qga2V5TWFwID0ga2V5bWFwKHtcbiAgICAgICAgRXNjYXBlOiBoYW5kbGVFc2NhcGVGcm9tQ2FsZW5kYXIsXG4gICAgICB9KTtcblxuICAgICAga2V5TWFwKGV2ZW50KTtcbiAgICB9LFxuICB9LFxuICBmb2N1c291dDoge1xuICAgIFtEQVRFX1BJQ0tFUl9FWFRFUk5BTF9JTlBVVF0oKSB7XG4gICAgICB2YWxpZGF0ZURhdGVJbnB1dCh0aGlzKTtcbiAgICB9LFxuICAgIFtEQVRFX1BJQ0tFUl0oZXZlbnQpIHtcbiAgICAgIGlmICghdGhpcy5jb250YWlucyhldmVudC5yZWxhdGVkVGFyZ2V0KSkge1xuICAgICAgICBoaWRlQ2FsZW5kYXIodGhpcyk7XG4gICAgICB9XG4gICAgfSxcbiAgfSxcbiAgaW5wdXQ6IHtcbiAgICBbREFURV9QSUNLRVJfRVhURVJOQUxfSU5QVVRdKCkge1xuICAgICAgcmVjb25jaWxlSW5wdXRWYWx1ZXModGhpcyk7XG4gICAgICB1cGRhdGVDYWxlbmRhcklmVmlzaWJsZSh0aGlzKTtcbiAgICB9LFxuICB9LFxufTtcblxuaWYgKCFpc0lvc0RldmljZSgpKSB7XG4gIGRhdGVQaWNrZXJFdmVudHMubW91c2VvdmVyID0ge1xuICAgIFtDQUxFTkRBUl9EQVRFX0NVUlJFTlRfTU9OVEhdKCkge1xuICAgICAgaGFuZGxlTW91c2VvdmVyRnJvbURhdGUodGhpcyk7XG4gICAgfSxcbiAgICBbQ0FMRU5EQVJfTU9OVEhdKCkge1xuICAgICAgaGFuZGxlTW91c2VvdmVyRnJvbU1vbnRoKHRoaXMpO1xuICAgIH0sXG4gICAgW0NBTEVOREFSX1lFQVJdKCkge1xuICAgICAgaGFuZGxlTW91c2VvdmVyRnJvbVllYXIodGhpcyk7XG4gICAgfSxcbiAgfTtcbn1cblxuY29uc3QgZGF0ZVBpY2tlciA9IGJlaGF2aW9yKGRhdGVQaWNrZXJFdmVudHMsIHtcbiAgaW5pdChyb290KSB7XG4gICAgc2VsZWN0T3JNYXRjaGVzKERBVEVfUElDS0VSLCByb290KS5mb3JFYWNoKChkYXRlUGlja2VyRWwpID0+IHtcbiAgICAgIGVuaGFuY2VEYXRlUGlja2VyKGRhdGVQaWNrZXJFbCk7XG4gICAgfSk7XG4gIH0sXG4gIGdldERhdGVQaWNrZXJDb250ZXh0LFxuICBkaXNhYmxlLFxuICBhcmlhRGlzYWJsZSxcbiAgZW5hYmxlLFxuICBpc0RhdGVJbnB1dEludmFsaWQsXG4gIHNldENhbGVuZGFyVmFsdWUsXG4gIHZhbGlkYXRlRGF0ZUlucHV0LFxuICByZW5kZXJDYWxlbmRhcixcbiAgdXBkYXRlQ2FsZW5kYXJJZlZpc2libGUsXG59KTtcblxuLy8gI2VuZHJlZ2lvbiBEYXRlIFBpY2tlciBFdmVudCBEZWxlZ2F0aW9uIFJlZ2lzdHJhdGlvbiAvIENvbXBvbmVudFxuXG5tb2R1bGUuZXhwb3J0cyA9IGRhdGVQaWNrZXI7XG4iLCJjb25zdCBzZWxlY3RPck1hdGNoZXMgPSByZXF1aXJlKFwiLi4vLi4vdXN3ZHMtY29yZS9zcmMvanMvdXRpbHMvc2VsZWN0LW9yLW1hdGNoZXNcIik7XG5jb25zdCBGb2N1c1RyYXAgPSByZXF1aXJlKFwiLi4vLi4vdXN3ZHMtY29yZS9zcmMvanMvdXRpbHMvZm9jdXMtdHJhcFwiKTtcbmNvbnN0IFNjcm9sbEJhcldpZHRoID0gcmVxdWlyZShcIi4uLy4uL3Vzd2RzLWNvcmUvc3JjL2pzL3V0aWxzL3Njcm9sbGJhci13aWR0aFwiKTtcbmNvbnN0IGJlaGF2aW9yID0gcmVxdWlyZShcIi4uLy4uL3Vzd2RzLWNvcmUvc3JjL2pzL3V0aWxzL2JlaGF2aW9yXCIpO1xuXG5jb25zdCB7IHByZWZpeDogUFJFRklYIH0gPSByZXF1aXJlKFwiLi4vLi4vdXN3ZHMtY29yZS9zcmMvanMvY29uZmlnXCIpO1xuXG5jb25zdCBNT0RBTF9DTEFTU05BTUUgPSBgJHtQUkVGSVh9LW1vZGFsYDtcbmNvbnN0IE9WRVJMQVlfQ0xBU1NOQU1FID0gYCR7TU9EQUxfQ0xBU1NOQU1FfS1vdmVybGF5YDtcbmNvbnN0IFdSQVBQRVJfQ0xBU1NOQU1FID0gYCR7TU9EQUxfQ0xBU1NOQU1FfS13cmFwcGVyYDtcbmNvbnN0IE9QRU5FUl9BVFRSSUJVVEUgPSBcImRhdGEtb3Blbi1tb2RhbFwiO1xuY29uc3QgQ0xPU0VSX0FUVFJJQlVURSA9IFwiZGF0YS1jbG9zZS1tb2RhbFwiO1xuY29uc3QgRk9SQ0VfQUNUSU9OX0FUVFJJQlVURSA9IFwiZGF0YS1mb3JjZS1hY3Rpb25cIjtcbmNvbnN0IE5PTl9NT0RBTF9ISURERU5fQVRUUklCVVRFID0gYGRhdGEtbW9kYWwtaGlkZGVuYDtcbmNvbnN0IE1PREFMID0gYC4ke01PREFMX0NMQVNTTkFNRX1gO1xuY29uc3QgSU5JVElBTF9GT0NVUyA9IGAuJHtXUkFQUEVSX0NMQVNTTkFNRX0gKltkYXRhLWZvY3VzXWA7XG5jb25zdCBDTE9TRV9CVVRUT04gPSBgJHtXUkFQUEVSX0NMQVNTTkFNRX0gKlske0NMT1NFUl9BVFRSSUJVVEV9XWA7XG5jb25zdCBPUEVORVJTID0gYCpbJHtPUEVORVJfQVRUUklCVVRFfV1bYXJpYS1jb250cm9sc11gO1xuY29uc3QgQ0xPU0VSUyA9IGAke0NMT1NFX0JVVFRPTn0sIC4ke09WRVJMQVlfQ0xBU1NOQU1FfTpub3QoWyR7Rk9SQ0VfQUNUSU9OX0FUVFJJQlVURX1dKWA7XG5jb25zdCBOT05fTU9EQUxTID0gYGJvZHkgPiAqOm5vdCguJHtXUkFQUEVSX0NMQVNTTkFNRX0pOm5vdChbYXJpYS1oaWRkZW5dKWA7XG5jb25zdCBOT05fTU9EQUxTX0hJRERFTiA9IGBbJHtOT05fTU9EQUxfSElEREVOX0FUVFJJQlVURX1dYDtcblxuY29uc3QgQUNUSVZFX0NMQVNTID0gXCJ1c2EtanMtbW9kYWwtLWFjdGl2ZVwiO1xuY29uc3QgUFJFVkVOVF9DTElDS19DTEFTUyA9IFwidXNhLWpzLW5vLWNsaWNrXCI7XG5jb25zdCBWSVNJQkxFX0NMQVNTID0gXCJpcy12aXNpYmxlXCI7XG5jb25zdCBISURERU5fQ0xBU1MgPSBcImlzLWhpZGRlblwiO1xuXG5sZXQgbW9kYWw7XG5sZXQgSU5JVElBTF9CT0RZX1BBRERJTkc7XG5sZXQgVEVNUE9SQVJZX0JPRFlfUEFERElORztcblxuY29uc3QgaXNBY3RpdmUgPSAoKSA9PiBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5jb250YWlucyhBQ1RJVkVfQ0xBU1MpO1xuY29uc3QgU0NST0xMQkFSX1dJRFRIID0gU2Nyb2xsQmFyV2lkdGgoKTtcblxuLyoqXG4gKiAgQ2xvc2VzIG1vZGFsIHdoZW4gYm91bmQgdG8gYSBidXR0b24gYW5kIHByZXNzZWQuXG4gKi9cbmNvbnN0IG9uTWVudUNsb3NlID0gKCkgPT4ge1xuICBtb2RhbC50b2dnbGVNb2RhbC5jYWxsKG1vZGFsLCBmYWxzZSk7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgdmFsdWUgZm9yIHRlbXBvcmFyeSBib2R5IHBhZGRpbmcgdGhhdCB3aWxsIGJlIGFwcGxpZWQgd2hlbiB0aGUgbW9kYWwgaXMgb3Blbi5cbiAqIFZhbHVlIGlzIGNyZWF0ZWQgYnkgY2hlY2tpbmcgZm9yIGluaXRpYWwgYm9keSBwYWRkaW5nIGFuZCBhZGRpbmcgdGhlIHdpZHRoIG9mIHRoZSBzY3JvbGxiYXIuXG4gKi9cbmNvbnN0IHNldFRlbXBvcmFyeUJvZHlQYWRkaW5nID0gKCkgPT4ge1xuICBJTklUSUFMX0JPRFlfUEFERElORyA9IHdpbmRvd1xuICAgIC5nZXRDb21wdXRlZFN0eWxlKGRvY3VtZW50LmJvZHkpXG4gICAgLmdldFByb3BlcnR5VmFsdWUoXCJwYWRkaW5nLXJpZ2h0XCIpO1xuICBURU1QT1JBUllfQk9EWV9QQURESU5HID0gYCR7XG4gICAgcGFyc2VJbnQoSU5JVElBTF9CT0RZX1BBRERJTkcucmVwbGFjZSgvcHgvLCBcIlwiKSwgMTApICtcbiAgICBwYXJzZUludChTQ1JPTExCQVJfV0lEVEgucmVwbGFjZSgvcHgvLCBcIlwiKSwgMTApXG4gIH1weGA7XG59O1xuXG4vKipcbiAqICBUb2dnbGUgdGhlIHZpc2liaWxpdHkgb2YgYSBtb2RhbCB3aW5kb3dcbiAqXG4gKiBAcGFyYW0ge0tleWJvYXJkRXZlbnR9IGV2ZW50IHRoZSBrZXlkb3duIGV2ZW50LlxuICogQHJldHVybnMge2Jvb2xlYW59IHNhZmVBY3RpdmUgaWYgbW9iaWxlIGlzIG9wZW4uXG4gKi9cbmZ1bmN0aW9uIHRvZ2dsZU1vZGFsKGV2ZW50KSB7XG4gIGxldCBvcmlnaW5hbE9wZW5lcjtcbiAgbGV0IGNsaWNrZWRFbGVtZW50ID0gZXZlbnQudGFyZ2V0O1xuICBjb25zdCB7IGJvZHkgfSA9IGRvY3VtZW50O1xuICBjb25zdCBzYWZlQWN0aXZlID0gIWlzQWN0aXZlKCk7XG4gIGNvbnN0IG1vZGFsSWQgPSBjbGlja2VkRWxlbWVudFxuICAgID8gY2xpY2tlZEVsZW1lbnQuZ2V0QXR0cmlidXRlKFwiYXJpYS1jb250cm9sc1wiKVxuICAgIDogZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi51c2EtbW9kYWwtd3JhcHBlci5pcy12aXNpYmxlXCIpO1xuICBjb25zdCB0YXJnZXRNb2RhbCA9IHNhZmVBY3RpdmVcbiAgICA/IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKG1vZGFsSWQpXG4gICAgOiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLnVzYS1tb2RhbC13cmFwcGVyLmlzLXZpc2libGVcIik7XG5cbiAgLy8gaWYgdGhlcmUgaXMgbm8gbW9kYWwgd2UgcmV0dXJuIGVhcmx5XG4gIGlmICghdGFyZ2V0TW9kYWwpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBjb25zdCBvcGVuRm9jdXNFbCA9IHRhcmdldE1vZGFsLnF1ZXJ5U2VsZWN0b3IoSU5JVElBTF9GT0NVUylcbiAgICA/IHRhcmdldE1vZGFsLnF1ZXJ5U2VsZWN0b3IoSU5JVElBTF9GT0NVUylcbiAgICA6IHRhcmdldE1vZGFsLnF1ZXJ5U2VsZWN0b3IoXCIudXNhLW1vZGFsXCIpO1xuICBjb25zdCByZXR1cm5Gb2N1cyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFxuICAgIHRhcmdldE1vZGFsLmdldEF0dHJpYnV0ZShcImRhdGEtb3BlbmVyXCIpXG4gICk7XG4gIGNvbnN0IG1lbnVCdXR0b24gPSBib2R5LnF1ZXJ5U2VsZWN0b3IoT1BFTkVSUyk7XG4gIGNvbnN0IGZvcmNlVXNlckFjdGlvbiA9IHRhcmdldE1vZGFsLmdldEF0dHJpYnV0ZShGT1JDRV9BQ1RJT05fQVRUUklCVVRFKTtcblxuICAvLyBTZXRzIHRoZSBjbGlja2VkIGVsZW1lbnQgdG8gdGhlIGNsb3NlIGJ1dHRvblxuICAvLyBzbyBlc2Mga2V5IGFsd2F5cyBjbG9zZXMgbW9kYWxcbiAgaWYgKGV2ZW50LnR5cGUgPT09IFwia2V5ZG93blwiICYmIHRhcmdldE1vZGFsICE9PSBudWxsKSB7XG4gICAgY2xpY2tlZEVsZW1lbnQgPSB0YXJnZXRNb2RhbC5xdWVyeVNlbGVjdG9yKENMT1NFX0JVVFRPTik7XG4gIH1cblxuICAvLyBXaGVuIHdlJ3JlIG5vdCBoaXR0aW5nIHRoZSBlc2NhcGUga2V54oCmXG4gIGlmIChjbGlja2VkRWxlbWVudCkge1xuICAgIC8vIE1ha2Ugc3VyZSB3ZSBjbGljayB0aGUgb3BlbmVyXG4gICAgLy8gSWYgaXQgZG9lc24ndCBoYXZlIGFuIElELCBtYWtlIG9uZVxuICAgIC8vIFN0b3JlIGlkIGFzIGRhdGEgYXR0cmlidXRlIG9uIG1vZGFsXG4gICAgaWYgKGNsaWNrZWRFbGVtZW50Lmhhc0F0dHJpYnV0ZShPUEVORVJfQVRUUklCVVRFKSkge1xuICAgICAgaWYgKHRoaXMuZ2V0QXR0cmlidXRlKFwiaWRcIikgPT09IG51bGwpIHtcbiAgICAgICAgb3JpZ2luYWxPcGVuZXIgPSBgbW9kYWwtJHtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiA5MDAwMDApICsgMTAwMDAwfWA7XG4gICAgICAgIHRoaXMuc2V0QXR0cmlidXRlKFwiaWRcIiwgb3JpZ2luYWxPcGVuZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3JpZ2luYWxPcGVuZXIgPSB0aGlzLmdldEF0dHJpYnV0ZShcImlkXCIpO1xuICAgICAgfVxuICAgICAgdGFyZ2V0TW9kYWwuc2V0QXR0cmlidXRlKFwiZGF0YS1vcGVuZXJcIiwgb3JpZ2luYWxPcGVuZXIpO1xuICAgIH1cblxuICAgIC8vIFRoaXMgYmFzaWNhbGx5IHN0b3BzIHRoZSBwcm9wYWdhdGlvbiBpZiB0aGUgZWxlbWVudFxuICAgIC8vIGlzIGluc2lkZSB0aGUgbW9kYWwgYW5kIG5vdCBhIGNsb3NlIGJ1dHRvbiBvclxuICAgIC8vIGVsZW1lbnQgaW5zaWRlIGEgY2xvc2UgYnV0dG9uXG4gICAgaWYgKGNsaWNrZWRFbGVtZW50LmNsb3Nlc3QoYC4ke01PREFMX0NMQVNTTkFNRX1gKSkge1xuICAgICAgaWYgKFxuICAgICAgICBjbGlja2VkRWxlbWVudC5oYXNBdHRyaWJ1dGUoQ0xPU0VSX0FUVFJJQlVURSkgfHxcbiAgICAgICAgY2xpY2tlZEVsZW1lbnQuY2xvc2VzdChgWyR7Q0xPU0VSX0FUVFJJQlVURX1dYClcbiAgICAgICkge1xuICAgICAgICAvLyBkbyBub3RoaW5nLiBtb3ZlIG9uLlxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGJvZHkuY2xhc3NMaXN0LnRvZ2dsZShBQ1RJVkVfQ0xBU1MsIHNhZmVBY3RpdmUpO1xuICB0YXJnZXRNb2RhbC5jbGFzc0xpc3QudG9nZ2xlKFZJU0lCTEVfQ0xBU1MsIHNhZmVBY3RpdmUpO1xuICB0YXJnZXRNb2RhbC5jbGFzc0xpc3QudG9nZ2xlKEhJRERFTl9DTEFTUywgIXNhZmVBY3RpdmUpO1xuXG4gIC8vIElmIHVzZXIgaXMgZm9yY2VkIHRvIHRha2UgYW4gYWN0aW9uLCBhZGRpbmdcbiAgLy8gYSBjbGFzcyB0byB0aGUgYm9keSB0aGF0IHByZXZlbnRzIGNsaWNraW5nIHVuZGVybmVhdGhcbiAgLy8gb3ZlcmxheVxuICBpZiAoZm9yY2VVc2VyQWN0aW9uKSB7XG4gICAgYm9keS5jbGFzc0xpc3QudG9nZ2xlKFBSRVZFTlRfQ0xJQ0tfQ0xBU1MsIHNhZmVBY3RpdmUpO1xuICB9XG5cbiAgLy8gVGVtcG9yYXJpbHkgaW5jcmVhc2UgYm9keSBwYWRkaW5nIHRvIGluY2x1ZGUgdGhlIHdpZHRoIG9mIHRoZSBzY3JvbGxiYXIuXG4gIC8vIFRoaXMgYWNjb3VudHMgZm9yIHRoZSBjb250ZW50IHNoaWZ0IHdoZW4gdGhlIHNjcm9sbGJhciBpcyByZW1vdmVkIG9uIG1vZGFsIG9wZW4uXG4gIGlmIChib2R5LnN0eWxlLnBhZGRpbmdSaWdodCA9PT0gVEVNUE9SQVJZX0JPRFlfUEFERElORykge1xuICAgIGJvZHkuc3R5bGUucmVtb3ZlUHJvcGVydHkoXCJwYWRkaW5nLXJpZ2h0XCIpO1xuICB9IGVsc2Uge1xuICAgIGJvZHkuc3R5bGUucGFkZGluZ1JpZ2h0ID0gVEVNUE9SQVJZX0JPRFlfUEFERElORztcbiAgfVxuXG4gIC8vIEhhbmRsZSB0aGUgZm9jdXMgYWN0aW9uc1xuICBpZiAoc2FmZUFjdGl2ZSAmJiBvcGVuRm9jdXNFbCkge1xuICAgIC8vIFRoZSBtb2RhbCB3aW5kb3cgaXMgb3BlbmVkLiBGb2N1cyBpcyBzZXQgdG8gY2xvc2UgYnV0dG9uLlxuXG4gICAgLy8gQmluZHMgZXNjYXBlIGtleSBpZiB3ZSdyZSBub3QgZm9yY2luZ1xuICAgIC8vIHRoZSB1c2VyIHRvIHRha2UgYW4gYWN0aW9uXG4gICAgaWYgKGZvcmNlVXNlckFjdGlvbikge1xuICAgICAgbW9kYWwuZm9jdXNUcmFwID0gRm9jdXNUcmFwKHRhcmdldE1vZGFsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbW9kYWwuZm9jdXNUcmFwID0gRm9jdXNUcmFwKHRhcmdldE1vZGFsLCB7XG4gICAgICAgIEVzY2FwZTogb25NZW51Q2xvc2UsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBIYW5kbGVzIGZvY3VzIHNldHRpbmcgYW5kIGludGVyYWN0aW9uc1xuICAgIG1vZGFsLmZvY3VzVHJhcC51cGRhdGUoc2FmZUFjdGl2ZSk7XG4gICAgb3BlbkZvY3VzRWwuZm9jdXMoKTtcblxuICAgIC8vIEhpZGVzIGV2ZXJ5dGhpbmcgdGhhdCBpcyBub3QgdGhlIG1vZGFsIGZyb20gc2NyZWVuIHJlYWRlcnNcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKE5PTl9NT0RBTFMpLmZvckVhY2goKG5vbk1vZGFsKSA9PiB7XG4gICAgICBub25Nb2RhbC5zZXRBdHRyaWJ1dGUoXCJhcmlhLWhpZGRlblwiLCBcInRydWVcIik7XG4gICAgICBub25Nb2RhbC5zZXRBdHRyaWJ1dGUoTk9OX01PREFMX0hJRERFTl9BVFRSSUJVVEUsIFwiXCIpO1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKCFzYWZlQWN0aXZlICYmIG1lbnVCdXR0b24gJiYgcmV0dXJuRm9jdXMpIHtcbiAgICAvLyBUaGUgbW9kYWwgd2luZG93IGlzIGNsb3NlZC5cbiAgICAvLyBOb24tbW9kYWxzIG5vdyBhY2Nlc2libGUgdG8gc2NyZWVuIHJlYWRlclxuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoTk9OX01PREFMU19ISURERU4pLmZvckVhY2goKG5vbk1vZGFsKSA9PiB7XG4gICAgICBub25Nb2RhbC5yZW1vdmVBdHRyaWJ1dGUoXCJhcmlhLWhpZGRlblwiKTtcbiAgICAgIG5vbk1vZGFsLnJlbW92ZUF0dHJpYnV0ZShOT05fTU9EQUxfSElEREVOX0FUVFJJQlVURSk7XG4gICAgfSk7XG5cbiAgICAvLyBGb2N1cyBpcyByZXR1cm5lZCB0byB0aGUgb3BlbmVyXG4gICAgcmV0dXJuRm9jdXMuZm9jdXMoKTtcbiAgICBtb2RhbC5mb2N1c1RyYXAudXBkYXRlKHNhZmVBY3RpdmUpO1xuICB9XG5cbiAgcmV0dXJuIHNhZmVBY3RpdmU7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIHBsYWNlaG9sZGVyIHdpdGggZGF0YSBhdHRyaWJ1dGVzIGZvciBjbGVhbnVwIGZ1bmN0aW9uLlxuICogVGhlIGNsZWFudXAgZnVuY3Rpb24gdXNlcyB0aGlzIHBsYWNlaG9sZGVyIHRvIGVhc2lseSByZXN0b3JlIHRoZSBvcmlnaW5hbCBNb2RhbCBIVE1MIG9uIHRlYXJkb3duLlxuICpcbiAqIEBwYXJhbSB7SFRNTERpdkVsZW1lbnR9IGJhc2VDb21wb25lbnQgLSBNb2RhbCBIVE1MIGZyb20gdGhlIERPTS5cbiAqIEByZXR1cm5zIHtIVE1MRGl2RWxlbWVudH0gUGxhY2Vob2xkZXIgdXNlZCBmb3IgY2xlYW51cCBmdW5jdGlvbi5cbiAqL1xuY29uc3QgY3JlYXRlUGxhY2VIb2xkZXIgPSAoYmFzZUNvbXBvbmVudCkgPT4ge1xuICBjb25zdCBtb2RhbElEID0gYmFzZUNvbXBvbmVudC5nZXRBdHRyaWJ1dGUoXCJpZFwiKTtcbiAgY29uc3Qgb3JpZ2luYWxMb2NhdGlvblBsYWNlSG9sZGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgY29uc3QgbW9kYWxBdHRyaWJ1dGVzID0gQXJyYXkuZnJvbShiYXNlQ29tcG9uZW50LmF0dHJpYnV0ZXMpO1xuXG4gIHNldFRlbXBvcmFyeUJvZHlQYWRkaW5nKCk7XG5cbiAgb3JpZ2luYWxMb2NhdGlvblBsYWNlSG9sZGVyLnNldEF0dHJpYnV0ZShgZGF0YS1wbGFjZWhvbGRlci1mb3JgLCBtb2RhbElEKTtcbiAgb3JpZ2luYWxMb2NhdGlvblBsYWNlSG9sZGVyLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgb3JpZ2luYWxMb2NhdGlvblBsYWNlSG9sZGVyLnNldEF0dHJpYnV0ZShcImFyaWEtaGlkZGVuXCIsIFwidHJ1ZVwiKTtcblxuICBtb2RhbEF0dHJpYnV0ZXMuZm9yRWFjaCgoYXR0cmlidXRlKSA9PiB7XG4gICAgb3JpZ2luYWxMb2NhdGlvblBsYWNlSG9sZGVyLnNldEF0dHJpYnV0ZShcbiAgICAgIGBkYXRhLW9yaWdpbmFsLSR7YXR0cmlidXRlLm5hbWV9YCxcbiAgICAgIGF0dHJpYnV0ZS52YWx1ZVxuICAgICk7XG4gIH0pO1xuXG4gIHJldHVybiBvcmlnaW5hbExvY2F0aW9uUGxhY2VIb2xkZXI7XG59O1xuXG4vKipcbiAqIE1vdmVzIG5lY2Vzc2FyeSBhdHRyaWJ1dGVzIGZyb20gTW9kYWwgSFRNTCB0byB3cmFwcGVyIGVsZW1lbnQuXG4gKlxuICogQHBhcmFtIHtIVE1MRGl2RWxlbWVudH0gYmFzZUNvbXBvbmVudCAtIE1vZGFsIEhUTUwgaW4gdGhlIERPTS5cbiAqIEBwYXJhbSB7SFRNTERpdkVsZW1lbnR9IG1vZGFsQ29udGVudFdyYXBwZXIgLSBNb2RhbCBjb21wb25lbnQgd3JhcHBlciBlbGVtZW50LlxuICogQHJldHVybnMgTW9kYWwgd3JhcHBlciB3aXRoIGNvcnJlY3QgYXR0cmlidXRlcy5cbiAqL1xuY29uc3Qgc2V0TW9kYWxBdHRyaWJ1dGVzID0gKGJhc2VDb21wb25lbnQsIG1vZGFsQ29udGVudFdyYXBwZXIpID0+IHtcbiAgY29uc3QgbW9kYWxJRCA9IGJhc2VDb21wb25lbnQuZ2V0QXR0cmlidXRlKFwiaWRcIik7XG4gIGNvbnN0IGFyaWFMYWJlbGxlZEJ5ID0gYmFzZUNvbXBvbmVudC5nZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsbGVkYnlcIik7XG4gIGNvbnN0IGFyaWFEZXNjcmliZWRCeSA9IGJhc2VDb21wb25lbnQuZ2V0QXR0cmlidXRlKFwiYXJpYS1kZXNjcmliZWRieVwiKTtcbiAgY29uc3QgZm9yY2VVc2VyQWN0aW9uID0gYmFzZUNvbXBvbmVudC5oYXNBdHRyaWJ1dGUoRk9SQ0VfQUNUSU9OX0FUVFJJQlVURSk7XG5cbiAgaWYgKCFhcmlhTGFiZWxsZWRCeSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoYCR7bW9kYWxJRH0gaXMgbWlzc2luZyBhcmlhLWxhYmVsbGVkYnkgYXR0cmlidXRlYCk7XG5cbiAgaWYgKCFhcmlhRGVzY3JpYmVkQnkpXG4gICAgdGhyb3cgbmV3IEVycm9yKGAke21vZGFsSUR9IGlzIG1pc3NpbmcgYXJpYS1kZXNyaWJlZGJ5IGF0dHJpYnV0ZWApO1xuXG4gIC8vIFNldCBhdHRyaWJ1dGVzXG4gIG1vZGFsQ29udGVudFdyYXBwZXIuc2V0QXR0cmlidXRlKFwicm9sZVwiLCBcImRpYWxvZ1wiKTtcbiAgbW9kYWxDb250ZW50V3JhcHBlci5zZXRBdHRyaWJ1dGUoXCJpZFwiLCBtb2RhbElEKTtcbiAgbW9kYWxDb250ZW50V3JhcHBlci5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsbGVkYnlcIiwgYXJpYUxhYmVsbGVkQnkpO1xuICBtb2RhbENvbnRlbnRXcmFwcGVyLnNldEF0dHJpYnV0ZShcImFyaWEtZGVzY3JpYmVkYnlcIiwgYXJpYURlc2NyaWJlZEJ5KTtcblxuICBpZiAoZm9yY2VVc2VyQWN0aW9uKSB7XG4gICAgbW9kYWxDb250ZW50V3JhcHBlci5zZXRBdHRyaWJ1dGUoRk9SQ0VfQUNUSU9OX0FUVFJJQlVURSwgZm9yY2VVc2VyQWN0aW9uKTtcbiAgfVxuXG4gIC8vIEFkZCBhcmlhLWNvbnRyb2xzXG4gIGNvbnN0IG1vZGFsQ2xvc2VycyA9IG1vZGFsQ29udGVudFdyYXBwZXIucXVlcnlTZWxlY3RvckFsbChDTE9TRVJTKTtcbiAgbW9kYWxDbG9zZXJzLmZvckVhY2goKGVsKSA9PiB7XG4gICAgZWwuc2V0QXR0cmlidXRlKFwiYXJpYS1jb250cm9sc1wiLCBtb2RhbElEKTtcbiAgfSk7XG5cbiAgLy8gVXBkYXRlIHRoZSBiYXNlIGVsZW1lbnQgSFRNTFxuICBiYXNlQ29tcG9uZW50LnJlbW92ZUF0dHJpYnV0ZShcImlkXCIpO1xuICBiYXNlQ29tcG9uZW50LnJlbW92ZUF0dHJpYnV0ZShcImFyaWEtbGFiZWxsZWRieVwiKTtcbiAgYmFzZUNvbXBvbmVudC5yZW1vdmVBdHRyaWJ1dGUoXCJhcmlhLWRlc2NyaWJlZGJ5XCIpO1xuICBiYXNlQ29tcG9uZW50LnNldEF0dHJpYnV0ZShcInRhYmluZGV4XCIsIFwiLTFcIik7XG5cbiAgcmV0dXJuIG1vZGFsQ29udGVudFdyYXBwZXI7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBoaWRkZW4gbW9kYWwgY29udGVudCB3cmFwcGVyLlxuICogUmVidWlsZHMgdGhlIG9yaWdpbmFsIE1vZGFsIEhUTUwgaW4gdGhlIG5ldyB3cmFwcGVyIGFuZCBhZGRzIGEgcGFnZSBvdmVybGF5LlxuICogVGhlbiBtb3ZlcyBvcmlnaW5hbCBNb2RhbCBIVE1MIGF0dHJpYnV0ZXMgdG8gdGhlIG5ldyB3cmFwcGVyLlxuICpcbiAqIEBwYXJhbSB7SFRNTERpdkVsZW1lbnR9IGJhc2VDb21wb25lbnQgLSBPcmlnaW5hbCBNb2RhbCBIVE1MIGluIHRoZSBET00uXG4gKiBAcmV0dXJucyBNb2RhbCBjb21wb25lbnQgLSBNb2RhbCB3cmFwcGVyIHcvIG5lc3RlZCBPdmVybGF5IGFuZCBNb2RhbCBDb250ZW50LlxuICovXG5jb25zdCByZWJ1aWxkTW9kYWwgPSAoYmFzZUNvbXBvbmVudCkgPT4ge1xuICBjb25zdCBtb2RhbENvbnRlbnQgPSBiYXNlQ29tcG9uZW50O1xuICBjb25zdCBtb2RhbENvbnRlbnRXcmFwcGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgY29uc3Qgb3ZlcmxheURpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG5cbiAgLy8gQWRkIGNsYXNzZXNcbiAgbW9kYWxDb250ZW50V3JhcHBlci5jbGFzc0xpc3QuYWRkKEhJRERFTl9DTEFTUywgV1JBUFBFUl9DTEFTU05BTUUpO1xuICBvdmVybGF5RGl2LmNsYXNzTGlzdC5hZGQoT1ZFUkxBWV9DTEFTU05BTUUpO1xuXG4gIC8vIFJlYnVpbGQgdGhlIG1vZGFsIGVsZW1lbnRcbiAgbW9kYWxDb250ZW50V3JhcHBlci5hcHBlbmQob3ZlcmxheURpdik7XG4gIG92ZXJsYXlEaXYuYXBwZW5kKG1vZGFsQ29udGVudCk7XG5cbiAgLy8gQWRkIGF0dHJpYnV0ZXNcbiAgc2V0TW9kYWxBdHRyaWJ1dGVzKG1vZGFsQ29udGVudCwgbW9kYWxDb250ZW50V3JhcHBlcik7XG5cbiAgcmV0dXJuIG1vZGFsQ29udGVudFdyYXBwZXI7XG59O1xuXG4vKipcbiAqICBCdWlsZHMgbW9kYWwgd2luZG93IGZyb20gYmFzZSBIVE1MIGFuZCBhcHBlbmRzIHRvIHRoZSBlbmQgb2YgdGhlIERPTS5cbiAqXG4gKiBAcGFyYW0ge0hUTUxEaXZFbGVtZW50fSBiYXNlQ29tcG9uZW50IC0gVGhlIG1vZGFsIGRpdiBlbGVtZW50IGluIHRoZSBET00uXG4gKi9cbmNvbnN0IHNldFVwTW9kYWwgPSAoYmFzZUNvbXBvbmVudCkgPT4ge1xuICBjb25zdCBtb2RhbElEID0gYmFzZUNvbXBvbmVudC5nZXRBdHRyaWJ1dGUoXCJpZFwiKTtcblxuICBpZiAoIW1vZGFsSUQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1vZGFsIG1hcmt1cCBpcyBtaXNzaW5nIElEYCk7XG4gIH1cblxuICAvLyBDcmVhdGUgcGxhY2Vob2xkZXIgd2hlcmUgbW9kYWwgaXMgZm9yIGNsZWFudXBcbiAgY29uc3Qgb3JpZ2luYWxMb2NhdGlvblBsYWNlSG9sZGVyID0gY3JlYXRlUGxhY2VIb2xkZXIoYmFzZUNvbXBvbmVudCk7XG4gIGJhc2VDb21wb25lbnQuYWZ0ZXIob3JpZ2luYWxMb2NhdGlvblBsYWNlSG9sZGVyKTtcblxuICAvLyBCdWlsZCBtb2RhbCBjb21wb25lbnRcbiAgY29uc3QgbW9kYWxDb21wb25lbnQgPSByZWJ1aWxkTW9kYWwoYmFzZUNvbXBvbmVudCk7XG5cbiAgLy8gTW92ZSBhbGwgbW9kYWxzIHRvIHRoZSBlbmQgb2YgdGhlIERPTS4gRG9pbmcgdGhpcyBhbGxvd3MgdXMgdG9cbiAgLy8gbW9yZSBlYXNpbHkgZmluZCB0aGUgZWxlbWVudHMgdG8gaGlkZSBmcm9tIHNjcmVlbiByZWFkZXJzXG4gIC8vIHdoZW4gdGhlIG1vZGFsIGlzIG9wZW4uXG4gIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobW9kYWxDb21wb25lbnQpO1xufTtcblxuLyoqXG4gKiBSZW1vdmVzIGR5bmFtaWNhbGx5IGNyZWF0ZWQgTW9kYWwgYW5kIFdyYXBwZXIgZWxlbWVudHMgYW5kIHJlc3RvcmVzIG9yaWdpbmFsIE1vZGFsIEhUTUwuXG4gKlxuICogQHBhcmFtIHtIVE1MRGl2RWxlbWVudH0gYmFzZUNvbXBvbmVudCAtIFRoZSBtb2RhbCBkaXYgZWxlbWVudCBpbiB0aGUgRE9NLlxuICovXG5jb25zdCBjbGVhblVwTW9kYWwgPSAoYmFzZUNvbXBvbmVudCkgPT4ge1xuICBjb25zdCBtb2RhbENvbnRlbnQgPSBiYXNlQ29tcG9uZW50O1xuICBjb25zdCBtb2RhbENvbnRlbnRXcmFwcGVyID0gbW9kYWxDb250ZW50LnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudDtcbiAgY29uc3QgbW9kYWxJRCA9IG1vZGFsQ29udGVudFdyYXBwZXIuZ2V0QXR0cmlidXRlKFwiaWRcIik7XG5cbiAgLy8gaWYgdGhlcmUgaXMgbm8gbW9kYWxJRCwgcmV0dXJuIGVhcmx5XG4gIGlmICghbW9kYWxJRCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IG9yaWdpbmFsTG9jYXRpb25QbGFjZUhvbGRlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXG4gICAgYFtkYXRhLXBsYWNlaG9sZGVyLWZvcj1cIiR7bW9kYWxJRH1cIl1gXG4gICk7XG5cbiAgaWYgKG9yaWdpbmFsTG9jYXRpb25QbGFjZUhvbGRlcikge1xuICAgIGNvbnN0IG1vZGFsQXR0cmlidXRlcyA9IEFycmF5LmZyb20ob3JpZ2luYWxMb2NhdGlvblBsYWNlSG9sZGVyLmF0dHJpYnV0ZXMpO1xuICAgIG1vZGFsQXR0cmlidXRlcy5mb3JFYWNoKChhdHRyaWJ1dGUpID0+IHtcbiAgICAgIGlmIChhdHRyaWJ1dGUubmFtZS5zdGFydHNXaXRoKFwiZGF0YS1vcmlnaW5hbC1cIikpIHtcbiAgICAgICAgLy8gZGF0YS1vcmlnaW5hbC0gaXMgMTQgbG9uZ1xuICAgICAgICBtb2RhbENvbnRlbnQuc2V0QXR0cmlidXRlKGF0dHJpYnV0ZS5uYW1lLnN1YnN0cigxNCksIGF0dHJpYnV0ZS52YWx1ZSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBvcmlnaW5hbExvY2F0aW9uUGxhY2VIb2xkZXIuYWZ0ZXIobW9kYWxDb250ZW50KTtcbiAgICBvcmlnaW5hbExvY2F0aW9uUGxhY2VIb2xkZXIucGFyZW50RWxlbWVudC5yZW1vdmVDaGlsZChcbiAgICAgIG9yaWdpbmFsTG9jYXRpb25QbGFjZUhvbGRlclxuICAgICk7XG4gIH1cblxuICBtb2RhbENvbnRlbnRXcmFwcGVyLnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQobW9kYWxDb250ZW50V3JhcHBlcik7XG59O1xuXG5tb2RhbCA9IGJlaGF2aW9yKFxuICB7fSxcbiAge1xuICAgIGluaXQocm9vdCkge1xuICAgICAgc2VsZWN0T3JNYXRjaGVzKE1PREFMLCByb290KS5mb3JFYWNoKChtb2RhbFdpbmRvdykgPT4ge1xuICAgICAgICBjb25zdCBtb2RhbElkID0gbW9kYWxXaW5kb3cuaWQ7XG5cbiAgICAgICAgc2V0VXBNb2RhbChtb2RhbFdpbmRvdyk7XG5cbiAgICAgICAgLy8gUXVlcnkgYWxsIG9wZW5lcnMgYW5kIGNsb3NlcnMgaW5jbHVkaW5nIHRoZSBvdmVybGF5XG4gICAgICAgIHNlbGVjdE9yTWF0Y2hlcyhgW2FyaWEtY29udHJvbHM9XCIke21vZGFsSWR9XCJdYCwgZG9jdW1lbnQpLmZvckVhY2goXG4gICAgICAgICAgKG1vZGFsVHJpZ2dlcikgPT4ge1xuICAgICAgICAgICAgLy8gSWYgbW9kYWxUcmlnZ2VyIGlzIGFuIGFuY2hvci4uLlxuICAgICAgICAgICAgaWYgKG1vZGFsVHJpZ2dlci5ub2RlTmFtZSA9PT0gXCJBXCIpIHtcbiAgICAgICAgICAgICAgLy8gVHVybiBhbmNob3IgbGlua3MgaW50byBidXR0b25zIGZvciBzY3JlZW4gcmVhZGVyc1xuICAgICAgICAgICAgICBtb2RhbFRyaWdnZXIuc2V0QXR0cmlidXRlKFwicm9sZVwiLCBcImJ1dHRvblwiKTtcblxuICAgICAgICAgICAgICAvLyBQcmV2ZW50IG1vZGFsIHRyaWdnZXJzIGZyb20gYWN0aW5nIGxpa2UgbGlua3NcbiAgICAgICAgICAgICAgbW9kYWxUcmlnZ2VyLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoZSkgPT4gZS5wcmV2ZW50RGVmYXVsdCgpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2FuIHVuY29tbWVudCB3aGVuIGFyaWEtaGFzcG9wdXA9XCJkaWFsb2dcIiBpcyBzdXBwb3J0ZWRcbiAgICAgICAgICAgIC8vIGh0dHBzOi8vYTExeXN1cHBvcnQuaW8vdGVjaC9hcmlhL2FyaWEtaGFzcG9wdXBfYXR0cmlidXRlXG4gICAgICAgICAgICAvLyBNb3N0IHNjcmVlbiByZWFkZXJzIHN1cHBvcnQgYXJpYS1oYXNwb3B1cCwgYnV0IG1pZ2h0IGFubm91bmNlXG4gICAgICAgICAgICAvLyBhcyBvcGVuaW5nIGEgbWVudSBpZiBcImRpYWxvZ1wiIGlzIG5vdCBzdXBwb3J0ZWQuXG4gICAgICAgICAgICAvLyBtb2RhbFRyaWdnZXIuc2V0QXR0cmlidXRlKFwiYXJpYS1oYXNwb3B1cFwiLCBcImRpYWxvZ1wiKTtcblxuICAgICAgICAgICAgbW9kYWxUcmlnZ2VyLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCB0b2dnbGVNb2RhbCk7XG4gICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICB0ZWFyZG93bihyb290KSB7XG4gICAgICBzZWxlY3RPck1hdGNoZXMoTU9EQUwsIHJvb3QpLmZvckVhY2goKG1vZGFsV2luZG93KSA9PiB7XG4gICAgICAgIGNvbnN0IG1vZGFsSWQgPSBtb2RhbFdpbmRvdy5pZDtcbiAgICAgICAgY2xlYW5VcE1vZGFsKG1vZGFsV2luZG93KTtcblxuICAgICAgICBzZWxlY3RPck1hdGNoZXMoYFthcmlhLWNvbnRyb2xzPVwiJHttb2RhbElkfVwiXWAsIGRvY3VtZW50KS5mb3JFYWNoKFxuICAgICAgICAgIChtb2RhbFRyaWdnZXIpID0+XG4gICAgICAgICAgICBtb2RhbFRyaWdnZXIucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHRvZ2dsZU1vZGFsKVxuICAgICAgICApO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBmb2N1c1RyYXA6IG51bGwsXG4gICAgdG9nZ2xlTW9kYWwsXG4gIH1cbik7XG5cbm1vZHVsZS5leHBvcnRzID0gbW9kYWw7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgLy8gVGhpcyB1c2VkIHRvIGJlIGNvbmRpdGlvbmFsbHkgZGVwZW5kZW50IG9uIHdoZXRoZXIgdGhlXG4gIC8vIGJyb3dzZXIgc3VwcG9ydGVkIHRvdWNoIGV2ZW50czsgaWYgaXQgZGlkLCBgQ0xJQ0tgIHdhcyBzZXQgdG9cbiAgLy8gYHRvdWNoc3RhcnRgLiAgSG93ZXZlciwgdGhpcyBoYWQgZG93bnNpZGVzOlxuICAvL1xuICAvLyAqIEl0IHByZS1lbXB0ZWQgbW9iaWxlIGJyb3dzZXJzJyBkZWZhdWx0IGJlaGF2aW9yIG9mIGRldGVjdGluZ1xuICAvLyAgIHdoZXRoZXIgYSB0b3VjaCB0dXJuZWQgaW50byBhIHNjcm9sbCwgdGhlcmVieSBwcmV2ZW50aW5nXG4gIC8vICAgdXNlcnMgZnJvbSB1c2luZyBzb21lIG9mIG91ciBjb21wb25lbnRzIGFzIHNjcm9sbCBzdXJmYWNlcy5cbiAgLy9cbiAgLy8gKiBTb21lIGRldmljZXMsIHN1Y2ggYXMgdGhlIE1pY3Jvc29mdCBTdXJmYWNlIFBybywgc3VwcG9ydCAqYm90aCpcbiAgLy8gICB0b3VjaCBhbmQgY2xpY2tzLiBUaGlzIG1lYW50IHRoZSBjb25kaXRpb25hbCBlZmZlY3RpdmVseSBkcm9wcGVkXG4gIC8vICAgc3VwcG9ydCBmb3IgdGhlIHVzZXIncyBtb3VzZSwgZnJ1c3RyYXRpbmcgdXNlcnMgd2hvIHByZWZlcnJlZFxuICAvLyAgIGl0IG9uIHRob3NlIHN5c3RlbXMuXG4gIENMSUNLOiBcImNsaWNrXCIsXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSAoaHRtbERvY3VtZW50ID0gZG9jdW1lbnQpID0+IGh0bWxEb2N1bWVudC5hY3RpdmVFbGVtZW50O1xuIiwiY29uc3QgYXNzaWduID0gcmVxdWlyZShcIm9iamVjdC1hc3NpZ25cIik7XG5jb25zdCBCZWhhdmlvciA9IHJlcXVpcmUoXCJyZWNlcHRvci9iZWhhdmlvclwiKTtcblxuLyoqXG4gKiBAbmFtZSBzZXF1ZW5jZVxuICogQHBhcmFtIHsuLi5GdW5jdGlvbn0gc2VxIGFuIGFycmF5IG9mIGZ1bmN0aW9uc1xuICogQHJldHVybiB7IGNsb3N1cmUgfSBjYWxsSG9va3NcbiAqL1xuLy8gV2UgdXNlIGEgbmFtZWQgZnVuY3Rpb24gaGVyZSBiZWNhdXNlIHdlIHdhbnQgaXQgdG8gaW5oZXJpdCBpdHMgbGV4aWNhbCBzY29wZVxuLy8gZnJvbSB0aGUgYmVoYXZpb3IgcHJvcHMgb2JqZWN0LCBub3QgZnJvbSB0aGUgbW9kdWxlXG5jb25zdCBzZXF1ZW5jZSA9ICguLi5zZXEpID0+XG4gIGZ1bmN0aW9uIGNhbGxIb29rcyh0YXJnZXQgPSBkb2N1bWVudC5ib2R5KSB7XG4gICAgc2VxLmZvckVhY2goKG1ldGhvZCkgPT4ge1xuICAgICAgaWYgKHR5cGVvZiB0aGlzW21ldGhvZF0gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICB0aGlzW21ldGhvZF0uY2FsbCh0aGlzLCB0YXJnZXQpO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xuXG4vKipcbiAqIEBuYW1lIGJlaGF2aW9yXG4gKiBAcGFyYW0ge29iamVjdH0gZXZlbnRzXG4gKiBAcGFyYW0ge29iamVjdD99IHByb3BzXG4gKiBAcmV0dXJuIHtyZWNlcHRvci5iZWhhdmlvcn1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSAoZXZlbnRzLCBwcm9wcykgPT5cbiAgQmVoYXZpb3IoXG4gICAgZXZlbnRzLFxuICAgIGFzc2lnbihcbiAgICAgIHtcbiAgICAgICAgb246IHNlcXVlbmNlKFwiaW5pdFwiLCBcImFkZFwiKSxcbiAgICAgICAgb2ZmOiBzZXF1ZW5jZShcInRlYXJkb3duXCIsIFwicmVtb3ZlXCIpLFxuICAgICAgfSxcbiAgICAgIHByb3BzXG4gICAgKVxuICApO1xuIiwiY29uc3QgYXNzaWduID0gcmVxdWlyZShcIm9iamVjdC1hc3NpZ25cIik7XG5jb25zdCB7IGtleW1hcCB9ID0gcmVxdWlyZShcInJlY2VwdG9yXCIpO1xuY29uc3QgYmVoYXZpb3IgPSByZXF1aXJlKFwiLi9iZWhhdmlvclwiKTtcbmNvbnN0IHNlbGVjdCA9IHJlcXVpcmUoXCIuL3NlbGVjdFwiKTtcbmNvbnN0IGFjdGl2ZUVsZW1lbnQgPSByZXF1aXJlKFwiLi9hY3RpdmUtZWxlbWVudFwiKTtcblxuY29uc3QgRk9DVVNBQkxFID1cbiAgJ2FbaHJlZl0sIGFyZWFbaHJlZl0sIGlucHV0Om5vdChbZGlzYWJsZWRdKSwgc2VsZWN0Om5vdChbZGlzYWJsZWRdKSwgdGV4dGFyZWE6bm90KFtkaXNhYmxlZF0pLCBidXR0b246bm90KFtkaXNhYmxlZF0pLCBpZnJhbWUsIG9iamVjdCwgZW1iZWQsIFt0YWJpbmRleD1cIjBcIl0sIFtjb250ZW50ZWRpdGFibGVdJztcblxuY29uc3QgdGFiSGFuZGxlciA9IChjb250ZXh0KSA9PiB7XG4gIGNvbnN0IGZvY3VzYWJsZUVsZW1lbnRzID0gc2VsZWN0KEZPQ1VTQUJMRSwgY29udGV4dCk7XG4gIGNvbnN0IGZpcnN0VGFiU3RvcCA9IGZvY3VzYWJsZUVsZW1lbnRzWzBdO1xuICBjb25zdCBsYXN0VGFiU3RvcCA9IGZvY3VzYWJsZUVsZW1lbnRzW2ZvY3VzYWJsZUVsZW1lbnRzLmxlbmd0aCAtIDFdO1xuXG4gIC8vIFNwZWNpYWwgcnVsZXMgZm9yIHdoZW4gdGhlIHVzZXIgaXMgdGFiYmluZyBmb3J3YXJkIGZyb20gdGhlIGxhc3QgZm9jdXNhYmxlIGVsZW1lbnQsXG4gIC8vIG9yIHdoZW4gdGFiYmluZyBiYWNrd2FyZHMgZnJvbSB0aGUgZmlyc3QgZm9jdXNhYmxlIGVsZW1lbnRcbiAgZnVuY3Rpb24gdGFiQWhlYWQoZXZlbnQpIHtcbiAgICBpZiAoYWN0aXZlRWxlbWVudCgpID09PSBsYXN0VGFiU3RvcCkge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGZpcnN0VGFiU3RvcC5mb2N1cygpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHRhYkJhY2soZXZlbnQpIHtcbiAgICBpZiAoYWN0aXZlRWxlbWVudCgpID09PSBmaXJzdFRhYlN0b3ApIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBsYXN0VGFiU3RvcC5mb2N1cygpO1xuICAgIH1cbiAgICAvLyBUaGlzIGNoZWNrcyBpZiB5b3Ugd2FudCB0byBzZXQgdGhlIGluaXRpYWwgZm9jdXMgdG8gYSBjb250YWluZXJcbiAgICAvLyBpbnN0ZWFkIG9mIGFuIGVsZW1lbnQgd2l0aGluLCBhbmQgdGhlIHVzZXIgdGFicyBiYWNrLlxuICAgIC8vIFRoZW4gd2Ugc2V0IHRoZSBmb2N1cyB0byB0aGUgZmlyc3RcbiAgICBlbHNlIGlmICghZm9jdXNhYmxlRWxlbWVudHMuaW5jbHVkZXMoYWN0aXZlRWxlbWVudCgpKSkge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGZpcnN0VGFiU3RvcC5mb2N1cygpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgZmlyc3RUYWJTdG9wLFxuICAgIGxhc3RUYWJTdG9wLFxuICAgIHRhYkFoZWFkLFxuICAgIHRhYkJhY2ssXG4gIH07XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IChjb250ZXh0LCBhZGRpdGlvbmFsS2V5QmluZGluZ3MgPSB7fSkgPT4ge1xuICBjb25zdCB0YWJFdmVudEhhbmRsZXIgPSB0YWJIYW5kbGVyKGNvbnRleHQpO1xuICBjb25zdCBiaW5kaW5ncyA9IGFkZGl0aW9uYWxLZXlCaW5kaW5ncztcbiAgY29uc3QgeyBFc2MsIEVzY2FwZSB9ID0gYmluZGluZ3M7XG5cbiAgaWYgKEVzY2FwZSAmJiAhRXNjKSBiaW5kaW5ncy5Fc2MgPSBFc2NhcGU7XG5cbiAgLy8gIFRPRE86IEluIHRoZSBmdXR1cmUsIGxvb3Agb3ZlciBhZGRpdGlvbmFsIGtleWJpbmRpbmdzIGFuZCBwYXNzIGFuIGFycmF5XG4gIC8vIG9mIGZ1bmN0aW9ucywgaWYgbmVjZXNzYXJ5LCB0byB0aGUgbWFwIGtleXMuIFRoZW4gcGVvcGxlIGltcGxlbWVudGluZ1xuICAvLyB0aGUgZm9jdXMgdHJhcCBjb3VsZCBwYXNzIGNhbGxiYWNrcyB0byBmaXJlIHdoZW4gdGFiYmluZ1xuICBjb25zdCBrZXlNYXBwaW5ncyA9IGtleW1hcChcbiAgICBhc3NpZ24oXG4gICAgICB7XG4gICAgICAgIFRhYjogdGFiRXZlbnRIYW5kbGVyLnRhYkFoZWFkLFxuICAgICAgICBcIlNoaWZ0K1RhYlwiOiB0YWJFdmVudEhhbmRsZXIudGFiQmFjayxcbiAgICAgIH0sXG4gICAgICBhZGRpdGlvbmFsS2V5QmluZGluZ3NcbiAgICApXG4gICk7XG5cbiAgY29uc3QgZm9jdXNUcmFwID0gYmVoYXZpb3IoXG4gICAge1xuICAgICAga2V5ZG93bjoga2V5TWFwcGluZ3MsXG4gICAgfSxcbiAgICB7XG4gICAgICBpbml0KCkge1xuICAgICAgICAvLyBUT0RPOiBpcyB0aGlzIGRlc2lyZWFibGUgYmVoYXZpb3I/IFNob3VsZCB0aGUgdHJhcCBhbHdheXMgZG8gdGhpcyBieSBkZWZhdWx0IG9yIHNob3VsZFxuICAgICAgICAvLyB0aGUgY29tcG9uZW50IGdldHRpbmcgZGVjb3JhdGVkIGhhbmRsZSB0aGlzP1xuICAgICAgICBpZiAodGFiRXZlbnRIYW5kbGVyLmZpcnN0VGFiU3RvcCkge1xuICAgICAgICAgIHRhYkV2ZW50SGFuZGxlci5maXJzdFRhYlN0b3AuZm9jdXMoKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIHVwZGF0ZShpc0FjdGl2ZSkge1xuICAgICAgICBpZiAoaXNBY3RpdmUpIHtcbiAgICAgICAgICB0aGlzLm9uKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5vZmYoKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICB9XG4gICk7XG5cbiAgcmV0dXJuIGZvY3VzVHJhcDtcbn07XG4iLCIvLyBpT1MgZGV0ZWN0aW9uIGZyb206IGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzkwMzk4ODUvMTc3NzEwXG5mdW5jdGlvbiBpc0lvc0RldmljZSgpIHtcbiAgcmV0dXJuIChcbiAgICB0eXBlb2YgbmF2aWdhdG9yICE9PSBcInVuZGVmaW5lZFwiICYmXG4gICAgKG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goLyhpUG9kfGlQaG9uZXxpUGFkKS9nKSB8fFxuICAgICAgKG5hdmlnYXRvci5wbGF0Zm9ybSA9PT0gXCJNYWNJbnRlbFwiICYmIG5hdmlnYXRvci5tYXhUb3VjaFBvaW50cyA+IDEpKSAmJlxuICAgICF3aW5kb3cuTVNTdHJlYW1cbiAgKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpc0lvc0RldmljZTtcbiIsIi8qIGVzbGludC1kaXNhYmxlICovXG4vKiBnbG9iYWxzIGRlZmluZSwgbW9kdWxlICovXG5cbi8qKlxuICogQSBzaW1wbGUgbGlicmFyeSB0byBoZWxwIHlvdSBlc2NhcGUgSFRNTCB1c2luZyB0ZW1wbGF0ZSBzdHJpbmdzLlxuICpcbiAqIEl0J3MgdGhlIGNvdW50ZXJwYXJ0IHRvIG91ciBlc2xpbnQgXCJuby11bnNhZmUtaW5uZXJodG1sXCIgcGx1Z2luIHRoYXQgaGVscHMgdXNcbiAqIGF2b2lkIHVuc2FmZSBjb2RpbmcgcHJhY3RpY2VzLlxuICogQSBmdWxsIHdyaXRlLXVwIG9mIHRoZSBIb3dzIGFuZCBXaHlzIGFyZSBkb2N1bWVudGVkXG4gKiBmb3IgZGV2ZWxvcGVycyBhdFxuICogIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL0ZpcmVmb3hfT1MvU2VjdXJpdHkvU2VjdXJpdHlfQXV0b21hdGlvblxuICogd2l0aCBhZGRpdGlvbmFsIGJhY2tncm91bmQgaW5mb3JtYXRpb24gYW5kIGRlc2lnbiBkb2NzIGF0XG4gKiAgaHR0cHM6Ly93aWtpLm1vemlsbGEub3JnL1VzZXI6RmJyYXVuL0dhaWEvU2FmZWlubmVySFRNTFJvYWRtYXBcbiAqXG4gKi9cblxuIShmdW5jdGlvbiAoZmFjdG9yeSkge1xuICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcbn0pKGZ1bmN0aW9uICgpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgdmFyIFNhbml0aXplciA9IHtcbiAgICBfZW50aXR5OiAvWyY8PlwiJy9dL2csXG5cbiAgICBfZW50aXRpZXM6IHtcbiAgICAgIFwiJlwiOiBcIiZhbXA7XCIsXG4gICAgICBcIjxcIjogXCImbHQ7XCIsXG4gICAgICBcIj5cIjogXCImZ3Q7XCIsXG4gICAgICAnXCInOiBcIiZxdW90O1wiLFxuICAgICAgXCInXCI6IFwiJmFwb3M7XCIsXG4gICAgICBcIi9cIjogXCImI3gyRjtcIixcbiAgICB9LFxuXG4gICAgZ2V0RW50aXR5OiBmdW5jdGlvbiAocykge1xuICAgICAgcmV0dXJuIFNhbml0aXplci5fZW50aXRpZXNbc107XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEVzY2FwZXMgSFRNTCBmb3IgYWxsIHZhbHVlcyBpbiBhIHRhZ2dlZCB0ZW1wbGF0ZSBzdHJpbmcuXG4gICAgICovXG4gICAgZXNjYXBlSFRNTDogZnVuY3Rpb24gKHN0cmluZ3MpIHtcbiAgICAgIHZhciByZXN1bHQgPSBcIlwiO1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0cmluZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcmVzdWx0ICs9IHN0cmluZ3NbaV07XG4gICAgICAgIGlmIChpICsgMSA8IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICB2YXIgdmFsdWUgPSBhcmd1bWVudHNbaSArIDFdIHx8IFwiXCI7XG4gICAgICAgICAgcmVzdWx0ICs9IFN0cmluZyh2YWx1ZSkucmVwbGFjZShcbiAgICAgICAgICAgIFNhbml0aXplci5fZW50aXR5LFxuICAgICAgICAgICAgU2FuaXRpemVyLmdldEVudGl0eVxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEVzY2FwZXMgSFRNTCBhbmQgcmV0dXJucyBhIHdyYXBwZWQgb2JqZWN0IHRvIGJlIHVzZWQgZHVyaW5nIERPTSBpbnNlcnRpb25cbiAgICAgKi9cbiAgICBjcmVhdGVTYWZlSFRNTDogZnVuY3Rpb24gKHN0cmluZ3MpIHtcbiAgICAgIHZhciBfbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgIHZhciB2YWx1ZXMgPSBuZXcgQXJyYXkoX2xlbiA+IDEgPyBfbGVuIC0gMSA6IDApO1xuICAgICAgZm9yICh2YXIgX2tleSA9IDE7IF9rZXkgPCBfbGVuOyBfa2V5KyspIHtcbiAgICAgICAgdmFsdWVzW19rZXkgLSAxXSA9IGFyZ3VtZW50c1tfa2V5XTtcbiAgICAgIH1cblxuICAgICAgdmFyIGVzY2FwZWQgPSBTYW5pdGl6ZXIuZXNjYXBlSFRNTC5hcHBseShcbiAgICAgICAgU2FuaXRpemVyLFxuICAgICAgICBbc3RyaW5nc10uY29uY2F0KHZhbHVlcylcbiAgICAgICk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBfX2h0bWw6IGVzY2FwZWQsXG4gICAgICAgIHRvU3RyaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmV0dXJuIFwiW29iamVjdCBXcmFwcGVkSFRNTE9iamVjdF1cIjtcbiAgICAgICAgfSxcbiAgICAgICAgaW5mbzpcbiAgICAgICAgICBcIlRoaXMgaXMgYSB3cmFwcGVkIEhUTUwgb2JqZWN0LiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vclwiICtcbiAgICAgICAgICBcImcvZW4tVVMvRmlyZWZveF9PUy9TZWN1cml0eS9TZWN1cml0eV9BdXRvbWF0aW9uIGZvciBtb3JlLlwiLFxuICAgICAgfTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIFVud3JhcCBzYWZlIEhUTUwgY3JlYXRlZCBieSBjcmVhdGVTYWZlSFRNTCBvciBhIGN1c3RvbSByZXBsYWNlbWVudCB0aGF0XG4gICAgICogdW5kZXJ3ZW50IHNlY3VyaXR5IHJldmlldy5cbiAgICAgKi9cbiAgICB1bndyYXBTYWZlSFRNTDogZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIF9sZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgdmFyIGh0bWxPYmplY3RzID0gbmV3IEFycmF5KF9sZW4pO1xuICAgICAgZm9yICh2YXIgX2tleSA9IDA7IF9rZXkgPCBfbGVuOyBfa2V5KyspIHtcbiAgICAgICAgaHRtbE9iamVjdHNbX2tleV0gPSBhcmd1bWVudHNbX2tleV07XG4gICAgICB9XG5cbiAgICAgIHZhciBtYXJrdXBMaXN0ID0gaHRtbE9iamVjdHMubWFwKGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgcmV0dXJuIG9iai5fX2h0bWw7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBtYXJrdXBMaXN0LmpvaW4oXCJcIik7XG4gICAgfSxcbiAgfTtcblxuICByZXR1cm4gU2FuaXRpemVyO1xufSk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdldFNjcm9sbGJhcldpZHRoKCkge1xuICAvLyBDcmVhdGluZyBpbnZpc2libGUgY29udGFpbmVyXG4gIGNvbnN0IG91dGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgb3V0ZXIuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XG4gIG91dGVyLnN0eWxlLm92ZXJmbG93ID0gXCJzY3JvbGxcIjsgLy8gZm9yY2luZyBzY3JvbGxiYXIgdG8gYXBwZWFyXG4gIG91dGVyLnN0eWxlLm1zT3ZlcmZsb3dTdHlsZSA9IFwic2Nyb2xsYmFyXCI7IC8vIG5lZWRlZCBmb3IgV2luSlMgYXBwc1xuICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKG91dGVyKTtcblxuICAvLyBDcmVhdGluZyBpbm5lciBlbGVtZW50IGFuZCBwbGFjaW5nIGl0IGluIHRoZSBjb250YWluZXJcbiAgY29uc3QgaW5uZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICBvdXRlci5hcHBlbmRDaGlsZChpbm5lcik7XG5cbiAgLy8gQ2FsY3VsYXRpbmcgZGlmZmVyZW5jZSBiZXR3ZWVuIGNvbnRhaW5lcidzIGZ1bGwgd2lkdGggYW5kIHRoZSBjaGlsZCB3aWR0aFxuICBjb25zdCBzY3JvbGxiYXJXaWR0aCA9IGAke291dGVyLm9mZnNldFdpZHRoIC0gaW5uZXIub2Zmc2V0V2lkdGh9cHhgO1xuXG4gIC8vIFJlbW92aW5nIHRlbXBvcmFyeSBlbGVtZW50cyBmcm9tIHRoZSBET01cbiAgb3V0ZXIucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChvdXRlcik7XG5cbiAgcmV0dXJuIHNjcm9sbGJhcldpZHRoO1xufTtcbiIsImNvbnN0IHNlbGVjdCA9IHJlcXVpcmUoXCIuL3NlbGVjdFwiKTtcbi8qKlxuICogQG5hbWUgaXNFbGVtZW50XG4gKiBAZGVzYyByZXR1cm5zIHdoZXRoZXIgb3Igbm90IHRoZSBnaXZlbiBhcmd1bWVudCBpcyBhIERPTSBlbGVtZW50LlxuICogQHBhcmFtIHthbnl9IHZhbHVlXG4gKiBAcmV0dXJuIHtib29sZWFufVxuICovXG5jb25zdCBpc0VsZW1lbnQgPSAodmFsdWUpID0+XG4gIHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiAmJiB2YWx1ZS5ub2RlVHlwZSA9PT0gMTtcblxuLyoqXG4gKiBAbmFtZSBzZWxlY3RPck1hdGNoZXNcbiAqIEBkZXNjIHNlbGVjdHMgZWxlbWVudHMgZnJvbSB0aGUgRE9NIGJ5IGNsYXNzIHNlbGVjdG9yIG9yIElEIHNlbGVjdG9yLlxuICogQHBhcmFtIHtzdHJpbmd9IHNlbGVjdG9yIC0gVGhlIHNlbGVjdG9yIHRvIHRyYXZlcnNlIHRoZSBET00gd2l0aC5cbiAqIEBwYXJhbSB7RG9jdW1lbnR8SFRNTEVsZW1lbnQ/fSBjb250ZXh0IC0gVGhlIGNvbnRleHQgdG8gdHJhdmVyc2UgdGhlIERPTVxuICogICBpbi4gSWYgbm90IHByb3ZpZGVkLCBpdCBkZWZhdWx0cyB0byB0aGUgZG9jdW1lbnQuXG4gKiBAcmV0dXJuIHtIVE1MRWxlbWVudFtdfSAtIEFuIGFycmF5IG9mIERPTSBub2RlcyBvciBhbiBlbXB0eSBhcnJheS5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSAoc2VsZWN0b3IsIGNvbnRleHQpID0+IHtcbiAgY29uc3Qgc2VsZWN0aW9uID0gc2VsZWN0KHNlbGVjdG9yLCBjb250ZXh0KTtcbiAgaWYgKHR5cGVvZiBzZWxlY3RvciAhPT0gXCJzdHJpbmdcIikge1xuICAgIHJldHVybiBzZWxlY3Rpb247XG4gIH1cblxuICBpZiAoaXNFbGVtZW50KGNvbnRleHQpICYmIGNvbnRleHQubWF0Y2hlcyhzZWxlY3RvcikpIHtcbiAgICBzZWxlY3Rpb24ucHVzaChjb250ZXh0KTtcbiAgfVxuXG4gIHJldHVybiBzZWxlY3Rpb247XG59O1xuIiwiLyoqXG4gKiBAbmFtZSBpc0VsZW1lbnRcbiAqIEBkZXNjIHJldHVybnMgd2hldGhlciBvciBub3QgdGhlIGdpdmVuIGFyZ3VtZW50IGlzIGEgRE9NIGVsZW1lbnQuXG4gKiBAcGFyYW0ge2FueX0gdmFsdWVcbiAqIEByZXR1cm4ge2Jvb2xlYW59XG4gKi9cbmNvbnN0IGlzRWxlbWVudCA9ICh2YWx1ZSkgPT5cbiAgdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiICYmIHZhbHVlLm5vZGVUeXBlID09PSAxO1xuXG4vKipcbiAqIEBuYW1lIHNlbGVjdFxuICogQGRlc2Mgc2VsZWN0cyBlbGVtZW50cyBmcm9tIHRoZSBET00gYnkgY2xhc3Mgc2VsZWN0b3Igb3IgSUQgc2VsZWN0b3IuXG4gKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0b3IgLSBUaGUgc2VsZWN0b3IgdG8gdHJhdmVyc2UgdGhlIERPTSB3aXRoLlxuICogQHBhcmFtIHtEb2N1bWVudHxIVE1MRWxlbWVudD99IGNvbnRleHQgLSBUaGUgY29udGV4dCB0byB0cmF2ZXJzZSB0aGUgRE9NXG4gKiAgIGluLiBJZiBub3QgcHJvdmlkZWQsIGl0IGRlZmF1bHRzIHRvIHRoZSBkb2N1bWVudC5cbiAqIEByZXR1cm4ge0hUTUxFbGVtZW50W119IC0gQW4gYXJyYXkgb2YgRE9NIG5vZGVzIG9yIGFuIGVtcHR5IGFycmF5LlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IChzZWxlY3RvciwgY29udGV4dCkgPT4ge1xuICBpZiAodHlwZW9mIHNlbGVjdG9yICE9PSBcInN0cmluZ1wiKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgaWYgKCFjb250ZXh0IHx8ICFpc0VsZW1lbnQoY29udGV4dCkpIHtcbiAgICBjb250ZXh0ID0gd2luZG93LmRvY3VtZW50OyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXBhcmFtLXJlYXNzaWduXG4gIH1cblxuICBjb25zdCBzZWxlY3Rpb24gPSBjb250ZXh0LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoc2VsZWN0aW9uKTtcbn07XG4iLCIvLyBlbGVtZW50LWNsb3Nlc3QgfCBDQzAtMS4wIHwgZ2l0aHViLmNvbS9qb25hdGhhbnRuZWFsL2Nsb3Nlc3RcblxuKGZ1bmN0aW9uIChFbGVtZW50UHJvdG8pIHtcblx0aWYgKHR5cGVvZiBFbGVtZW50UHJvdG8ubWF0Y2hlcyAhPT0gJ2Z1bmN0aW9uJykge1xuXHRcdEVsZW1lbnRQcm90by5tYXRjaGVzID0gRWxlbWVudFByb3RvLm1zTWF0Y2hlc1NlbGVjdG9yIHx8IEVsZW1lbnRQcm90by5tb3pNYXRjaGVzU2VsZWN0b3IgfHwgRWxlbWVudFByb3RvLndlYmtpdE1hdGNoZXNTZWxlY3RvciB8fCBmdW5jdGlvbiBtYXRjaGVzKHNlbGVjdG9yKSB7XG5cdFx0XHR2YXIgZWxlbWVudCA9IHRoaXM7XG5cdFx0XHR2YXIgZWxlbWVudHMgPSAoZWxlbWVudC5kb2N1bWVudCB8fCBlbGVtZW50Lm93bmVyRG9jdW1lbnQpLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuXHRcdFx0dmFyIGluZGV4ID0gMDtcblxuXHRcdFx0d2hpbGUgKGVsZW1lbnRzW2luZGV4XSAmJiBlbGVtZW50c1tpbmRleF0gIT09IGVsZW1lbnQpIHtcblx0XHRcdFx0KytpbmRleDtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIEJvb2xlYW4oZWxlbWVudHNbaW5kZXhdKTtcblx0XHR9O1xuXHR9XG5cblx0aWYgKHR5cGVvZiBFbGVtZW50UHJvdG8uY2xvc2VzdCAhPT0gJ2Z1bmN0aW9uJykge1xuXHRcdEVsZW1lbnRQcm90by5jbG9zZXN0ID0gZnVuY3Rpb24gY2xvc2VzdChzZWxlY3Rvcikge1xuXHRcdFx0dmFyIGVsZW1lbnQgPSB0aGlzO1xuXG5cdFx0XHR3aGlsZSAoZWxlbWVudCAmJiBlbGVtZW50Lm5vZGVUeXBlID09PSAxKSB7XG5cdFx0XHRcdGlmIChlbGVtZW50Lm1hdGNoZXMoc2VsZWN0b3IpKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGVsZW1lbnQ7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRlbGVtZW50ID0gZWxlbWVudC5wYXJlbnROb2RlO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9O1xuXHR9XG59KSh3aW5kb3cuRWxlbWVudC5wcm90b3R5cGUpO1xuIiwiLyogZ2xvYmFsIGRlZmluZSwgS2V5Ym9hcmRFdmVudCwgbW9kdWxlICovXG5cbihmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIGtleWJvYXJkZXZlbnRLZXlQb2x5ZmlsbCA9IHtcbiAgICBwb2x5ZmlsbDogcG9seWZpbGwsXG4gICAga2V5czoge1xuICAgICAgMzogJ0NhbmNlbCcsXG4gICAgICA2OiAnSGVscCcsXG4gICAgICA4OiAnQmFja3NwYWNlJyxcbiAgICAgIDk6ICdUYWInLFxuICAgICAgMTI6ICdDbGVhcicsXG4gICAgICAxMzogJ0VudGVyJyxcbiAgICAgIDE2OiAnU2hpZnQnLFxuICAgICAgMTc6ICdDb250cm9sJyxcbiAgICAgIDE4OiAnQWx0JyxcbiAgICAgIDE5OiAnUGF1c2UnLFxuICAgICAgMjA6ICdDYXBzTG9jaycsXG4gICAgICAyNzogJ0VzY2FwZScsXG4gICAgICAyODogJ0NvbnZlcnQnLFxuICAgICAgMjk6ICdOb25Db252ZXJ0JyxcbiAgICAgIDMwOiAnQWNjZXB0JyxcbiAgICAgIDMxOiAnTW9kZUNoYW5nZScsXG4gICAgICAzMjogJyAnLFxuICAgICAgMzM6ICdQYWdlVXAnLFxuICAgICAgMzQ6ICdQYWdlRG93bicsXG4gICAgICAzNTogJ0VuZCcsXG4gICAgICAzNjogJ0hvbWUnLFxuICAgICAgMzc6ICdBcnJvd0xlZnQnLFxuICAgICAgMzg6ICdBcnJvd1VwJyxcbiAgICAgIDM5OiAnQXJyb3dSaWdodCcsXG4gICAgICA0MDogJ0Fycm93RG93bicsXG4gICAgICA0MTogJ1NlbGVjdCcsXG4gICAgICA0MjogJ1ByaW50JyxcbiAgICAgIDQzOiAnRXhlY3V0ZScsXG4gICAgICA0NDogJ1ByaW50U2NyZWVuJyxcbiAgICAgIDQ1OiAnSW5zZXJ0JyxcbiAgICAgIDQ2OiAnRGVsZXRlJyxcbiAgICAgIDQ4OiBbJzAnLCAnKSddLFxuICAgICAgNDk6IFsnMScsICchJ10sXG4gICAgICA1MDogWycyJywgJ0AnXSxcbiAgICAgIDUxOiBbJzMnLCAnIyddLFxuICAgICAgNTI6IFsnNCcsICckJ10sXG4gICAgICA1MzogWyc1JywgJyUnXSxcbiAgICAgIDU0OiBbJzYnLCAnXiddLFxuICAgICAgNTU6IFsnNycsICcmJ10sXG4gICAgICA1NjogWyc4JywgJyonXSxcbiAgICAgIDU3OiBbJzknLCAnKCddLFxuICAgICAgOTE6ICdPUycsXG4gICAgICA5MzogJ0NvbnRleHRNZW51JyxcbiAgICAgIDE0NDogJ051bUxvY2snLFxuICAgICAgMTQ1OiAnU2Nyb2xsTG9jaycsXG4gICAgICAxODE6ICdWb2x1bWVNdXRlJyxcbiAgICAgIDE4MjogJ1ZvbHVtZURvd24nLFxuICAgICAgMTgzOiAnVm9sdW1lVXAnLFxuICAgICAgMTg2OiBbJzsnLCAnOiddLFxuICAgICAgMTg3OiBbJz0nLCAnKyddLFxuICAgICAgMTg4OiBbJywnLCAnPCddLFxuICAgICAgMTg5OiBbJy0nLCAnXyddLFxuICAgICAgMTkwOiBbJy4nLCAnPiddLFxuICAgICAgMTkxOiBbJy8nLCAnPyddLFxuICAgICAgMTkyOiBbJ2AnLCAnfiddLFxuICAgICAgMjE5OiBbJ1snLCAneyddLFxuICAgICAgMjIwOiBbJ1xcXFwnLCAnfCddLFxuICAgICAgMjIxOiBbJ10nLCAnfSddLFxuICAgICAgMjIyOiBbXCInXCIsICdcIiddLFxuICAgICAgMjI0OiAnTWV0YScsXG4gICAgICAyMjU6ICdBbHRHcmFwaCcsXG4gICAgICAyNDY6ICdBdHRuJyxcbiAgICAgIDI0NzogJ0NyU2VsJyxcbiAgICAgIDI0ODogJ0V4U2VsJyxcbiAgICAgIDI0OTogJ0VyYXNlRW9mJyxcbiAgICAgIDI1MDogJ1BsYXknLFxuICAgICAgMjUxOiAnWm9vbU91dCdcbiAgICB9XG4gIH07XG5cbiAgLy8gRnVuY3Rpb24ga2V5cyAoRjEtMjQpLlxuICB2YXIgaTtcbiAgZm9yIChpID0gMTsgaSA8IDI1OyBpKyspIHtcbiAgICBrZXlib2FyZGV2ZW50S2V5UG9seWZpbGwua2V5c1sxMTEgKyBpXSA9ICdGJyArIGk7XG4gIH1cblxuICAvLyBQcmludGFibGUgQVNDSUkgY2hhcmFjdGVycy5cbiAgdmFyIGxldHRlciA9ICcnO1xuICBmb3IgKGkgPSA2NTsgaSA8IDkxOyBpKyspIHtcbiAgICBsZXR0ZXIgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGkpO1xuICAgIGtleWJvYXJkZXZlbnRLZXlQb2x5ZmlsbC5rZXlzW2ldID0gW2xldHRlci50b0xvd2VyQ2FzZSgpLCBsZXR0ZXIudG9VcHBlckNhc2UoKV07XG4gIH1cblxuICBmdW5jdGlvbiBwb2x5ZmlsbCAoKSB7XG4gICAgaWYgKCEoJ0tleWJvYXJkRXZlbnQnIGluIHdpbmRvdykgfHxcbiAgICAgICAgJ2tleScgaW4gS2V5Ym9hcmRFdmVudC5wcm90b3R5cGUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBQb2x5ZmlsbCBga2V5YCBvbiBgS2V5Ym9hcmRFdmVudGAuXG4gICAgdmFyIHByb3RvID0ge1xuICAgICAgZ2V0OiBmdW5jdGlvbiAoeCkge1xuICAgICAgICB2YXIga2V5ID0ga2V5Ym9hcmRldmVudEtleVBvbHlmaWxsLmtleXNbdGhpcy53aGljaCB8fCB0aGlzLmtleUNvZGVdO1xuXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGtleSkpIHtcbiAgICAgICAgICBrZXkgPSBrZXlbK3RoaXMuc2hpZnRLZXldO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGtleTtcbiAgICAgIH1cbiAgICB9O1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShLZXlib2FyZEV2ZW50LnByb3RvdHlwZSwgJ2tleScsIHByb3RvKTtcbiAgICByZXR1cm4gcHJvdG87XG4gIH1cblxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgZGVmaW5lKCdrZXlib2FyZGV2ZW50LWtleS1wb2x5ZmlsbCcsIGtleWJvYXJkZXZlbnRLZXlQb2x5ZmlsbCk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBrZXlib2FyZGV2ZW50S2V5UG9seWZpbGw7XG4gIH0gZWxzZSBpZiAod2luZG93KSB7XG4gICAgd2luZG93LmtleWJvYXJkZXZlbnRLZXlQb2x5ZmlsbCA9IGtleWJvYXJkZXZlbnRLZXlQb2x5ZmlsbDtcbiAgfVxuXG59KSgpO1xuIiwiLypcbm9iamVjdC1hc3NpZ25cbihjKSBTaW5kcmUgU29yaHVzXG5AbGljZW5zZSBNSVRcbiovXG5cbid1c2Ugc3RyaWN0Jztcbi8qIGVzbGludC1kaXNhYmxlIG5vLXVudXNlZC12YXJzICovXG52YXIgZ2V0T3duUHJvcGVydHlTeW1ib2xzID0gT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scztcbnZhciBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgcHJvcElzRW51bWVyYWJsZSA9IE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGU7XG5cbmZ1bmN0aW9uIHRvT2JqZWN0KHZhbCkge1xuXHRpZiAodmFsID09PSBudWxsIHx8IHZhbCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignT2JqZWN0LmFzc2lnbiBjYW5ub3QgYmUgY2FsbGVkIHdpdGggbnVsbCBvciB1bmRlZmluZWQnKTtcblx0fVxuXG5cdHJldHVybiBPYmplY3QodmFsKTtcbn1cblxuZnVuY3Rpb24gc2hvdWxkVXNlTmF0aXZlKCkge1xuXHR0cnkge1xuXHRcdGlmICghT2JqZWN0LmFzc2lnbikge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdC8vIERldGVjdCBidWdneSBwcm9wZXJ0eSBlbnVtZXJhdGlvbiBvcmRlciBpbiBvbGRlciBWOCB2ZXJzaW9ucy5cblxuXHRcdC8vIGh0dHBzOi8vYnVncy5jaHJvbWl1bS5vcmcvcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTQxMThcblx0XHR2YXIgdGVzdDEgPSBuZXcgU3RyaW5nKCdhYmMnKTsgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tbmV3LXdyYXBwZXJzXG5cdFx0dGVzdDFbNV0gPSAnZGUnO1xuXHRcdGlmIChPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh0ZXN0MSlbMF0gPT09ICc1Jykge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdC8vIGh0dHBzOi8vYnVncy5jaHJvbWl1bS5vcmcvcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTMwNTZcblx0XHR2YXIgdGVzdDIgPSB7fTtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IDEwOyBpKyspIHtcblx0XHRcdHRlc3QyWydfJyArIFN0cmluZy5mcm9tQ2hhckNvZGUoaSldID0gaTtcblx0XHR9XG5cdFx0dmFyIG9yZGVyMiA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRlc3QyKS5tYXAoZnVuY3Rpb24gKG4pIHtcblx0XHRcdHJldHVybiB0ZXN0MltuXTtcblx0XHR9KTtcblx0XHRpZiAob3JkZXIyLmpvaW4oJycpICE9PSAnMDEyMzQ1Njc4OScpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHQvLyBodHRwczovL2J1Z3MuY2hyb21pdW0ub3JnL3AvdjgvaXNzdWVzL2RldGFpbD9pZD0zMDU2XG5cdFx0dmFyIHRlc3QzID0ge307XG5cdFx0J2FiY2RlZmdoaWprbG1ub3BxcnN0Jy5zcGxpdCgnJykuZm9yRWFjaChmdW5jdGlvbiAobGV0dGVyKSB7XG5cdFx0XHR0ZXN0M1tsZXR0ZXJdID0gbGV0dGVyO1xuXHRcdH0pO1xuXHRcdGlmIChPYmplY3Qua2V5cyhPYmplY3QuYXNzaWduKHt9LCB0ZXN0MykpLmpvaW4oJycpICE9PVxuXHRcdFx0XHQnYWJjZGVmZ2hpamtsbW5vcHFyc3QnKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRydWU7XG5cdH0gY2F0Y2ggKGVycikge1xuXHRcdC8vIFdlIGRvbid0IGV4cGVjdCBhbnkgb2YgdGhlIGFib3ZlIHRvIHRocm93LCBidXQgYmV0dGVyIHRvIGJlIHNhZmUuXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc2hvdWxkVXNlTmF0aXZlKCkgPyBPYmplY3QuYXNzaWduIDogZnVuY3Rpb24gKHRhcmdldCwgc291cmNlKSB7XG5cdHZhciBmcm9tO1xuXHR2YXIgdG8gPSB0b09iamVjdCh0YXJnZXQpO1xuXHR2YXIgc3ltYm9scztcblxuXHRmb3IgKHZhciBzID0gMTsgcyA8IGFyZ3VtZW50cy5sZW5ndGg7IHMrKykge1xuXHRcdGZyb20gPSBPYmplY3QoYXJndW1lbnRzW3NdKTtcblxuXHRcdGZvciAodmFyIGtleSBpbiBmcm9tKSB7XG5cdFx0XHRpZiAoaGFzT3duUHJvcGVydHkuY2FsbChmcm9tLCBrZXkpKSB7XG5cdFx0XHRcdHRvW2tleV0gPSBmcm9tW2tleV07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKGdldE93blByb3BlcnR5U3ltYm9scykge1xuXHRcdFx0c3ltYm9scyA9IGdldE93blByb3BlcnR5U3ltYm9scyhmcm9tKTtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc3ltYm9scy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRpZiAocHJvcElzRW51bWVyYWJsZS5jYWxsKGZyb20sIHN5bWJvbHNbaV0pKSB7XG5cdFx0XHRcdFx0dG9bc3ltYm9sc1tpXV0gPSBmcm9tW3N5bWJvbHNbaV1dO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHRvO1xufTtcbiIsImNvbnN0IGFzc2lnbiA9IHJlcXVpcmUoJ29iamVjdC1hc3NpZ24nKTtcbmNvbnN0IGRlbGVnYXRlID0gcmVxdWlyZSgnLi4vZGVsZWdhdGUnKTtcbmNvbnN0IGRlbGVnYXRlQWxsID0gcmVxdWlyZSgnLi4vZGVsZWdhdGVBbGwnKTtcblxuY29uc3QgREVMRUdBVEVfUEFUVEVSTiA9IC9eKC4rKTpkZWxlZ2F0ZVxcKCguKylcXCkkLztcbmNvbnN0IFNQQUNFID0gJyAnO1xuXG5jb25zdCBnZXRMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlLCBoYW5kbGVyKSB7XG4gIHZhciBtYXRjaCA9IHR5cGUubWF0Y2goREVMRUdBVEVfUEFUVEVSTik7XG4gIHZhciBzZWxlY3RvcjtcbiAgaWYgKG1hdGNoKSB7XG4gICAgdHlwZSA9IG1hdGNoWzFdO1xuICAgIHNlbGVjdG9yID0gbWF0Y2hbMl07XG4gIH1cblxuICB2YXIgb3B0aW9ucztcbiAgaWYgKHR5cGVvZiBoYW5kbGVyID09PSAnb2JqZWN0Jykge1xuICAgIG9wdGlvbnMgPSB7XG4gICAgICBjYXB0dXJlOiBwb3BLZXkoaGFuZGxlciwgJ2NhcHR1cmUnKSxcbiAgICAgIHBhc3NpdmU6IHBvcEtleShoYW5kbGVyLCAncGFzc2l2ZScpXG4gICAgfTtcbiAgfVxuXG4gIHZhciBsaXN0ZW5lciA9IHtcbiAgICBzZWxlY3Rvcjogc2VsZWN0b3IsXG4gICAgZGVsZWdhdGU6ICh0eXBlb2YgaGFuZGxlciA9PT0gJ29iamVjdCcpXG4gICAgICA/IGRlbGVnYXRlQWxsKGhhbmRsZXIpXG4gICAgICA6IHNlbGVjdG9yXG4gICAgICAgID8gZGVsZWdhdGUoc2VsZWN0b3IsIGhhbmRsZXIpXG4gICAgICAgIDogaGFuZGxlcixcbiAgICBvcHRpb25zOiBvcHRpb25zXG4gIH07XG5cbiAgaWYgKHR5cGUuaW5kZXhPZihTUEFDRSkgPiAtMSkge1xuICAgIHJldHVybiB0eXBlLnNwbGl0KFNQQUNFKS5tYXAoZnVuY3Rpb24oX3R5cGUpIHtcbiAgICAgIHJldHVybiBhc3NpZ24oe3R5cGU6IF90eXBlfSwgbGlzdGVuZXIpO1xuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIGxpc3RlbmVyLnR5cGUgPSB0eXBlO1xuICAgIHJldHVybiBbbGlzdGVuZXJdO1xuICB9XG59O1xuXG52YXIgcG9wS2V5ID0gZnVuY3Rpb24ob2JqLCBrZXkpIHtcbiAgdmFyIHZhbHVlID0gb2JqW2tleV07XG4gIGRlbGV0ZSBvYmpba2V5XTtcbiAgcmV0dXJuIHZhbHVlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBiZWhhdmlvcihldmVudHMsIHByb3BzKSB7XG4gIGNvbnN0IGxpc3RlbmVycyA9IE9iamVjdC5rZXlzKGV2ZW50cylcbiAgICAucmVkdWNlKGZ1bmN0aW9uKG1lbW8sIHR5cGUpIHtcbiAgICAgIHZhciBsaXN0ZW5lcnMgPSBnZXRMaXN0ZW5lcnModHlwZSwgZXZlbnRzW3R5cGVdKTtcbiAgICAgIHJldHVybiBtZW1vLmNvbmNhdChsaXN0ZW5lcnMpO1xuICAgIH0sIFtdKTtcblxuICByZXR1cm4gYXNzaWduKHtcbiAgICBhZGQ6IGZ1bmN0aW9uIGFkZEJlaGF2aW9yKGVsZW1lbnQpIHtcbiAgICAgIGxpc3RlbmVycy5mb3JFYWNoKGZ1bmN0aW9uKGxpc3RlbmVyKSB7XG4gICAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgICAgICBsaXN0ZW5lci50eXBlLFxuICAgICAgICAgIGxpc3RlbmVyLmRlbGVnYXRlLFxuICAgICAgICAgIGxpc3RlbmVyLm9wdGlvbnNcbiAgICAgICAgKTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgcmVtb3ZlOiBmdW5jdGlvbiByZW1vdmVCZWhhdmlvcihlbGVtZW50KSB7XG4gICAgICBsaXN0ZW5lcnMuZm9yRWFjaChmdW5jdGlvbihsaXN0ZW5lcikge1xuICAgICAgICBlbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXG4gICAgICAgICAgbGlzdGVuZXIudHlwZSxcbiAgICAgICAgICBsaXN0ZW5lci5kZWxlZ2F0ZSxcbiAgICAgICAgICBsaXN0ZW5lci5vcHRpb25zXG4gICAgICAgICk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0sIHByb3BzKTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGNvbXBvc2UoZnVuY3Rpb25zKSB7XG4gIHJldHVybiBmdW5jdGlvbihlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9ucy5zb21lKGZ1bmN0aW9uKGZuKSB7XG4gICAgICByZXR1cm4gZm4uY2FsbCh0aGlzLCBlKSA9PT0gZmFsc2U7XG4gICAgfSwgdGhpcyk7XG4gIH07XG59O1xuIiwiLy8gcG9seWZpbGwgRWxlbWVudC5wcm90b3R5cGUuY2xvc2VzdFxucmVxdWlyZSgnZWxlbWVudC1jbG9zZXN0Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZGVsZWdhdGUoc2VsZWN0b3IsIGZuKSB7XG4gIHJldHVybiBmdW5jdGlvbiBkZWxlZ2F0aW9uKGV2ZW50KSB7XG4gICAgdmFyIHRhcmdldCA9IGV2ZW50LnRhcmdldC5jbG9zZXN0KHNlbGVjdG9yKTtcbiAgICBpZiAodGFyZ2V0KSB7XG4gICAgICByZXR1cm4gZm4uY2FsbCh0YXJnZXQsIGV2ZW50KTtcbiAgICB9XG4gIH1cbn07XG4iLCJjb25zdCBkZWxlZ2F0ZSA9IHJlcXVpcmUoJy4uL2RlbGVnYXRlJyk7XG5jb25zdCBjb21wb3NlID0gcmVxdWlyZSgnLi4vY29tcG9zZScpO1xuXG5jb25zdCBTUExBVCA9ICcqJztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBkZWxlZ2F0ZUFsbChzZWxlY3RvcnMpIHtcbiAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKHNlbGVjdG9ycylcblxuICAvLyBYWFggb3B0aW1pemF0aW9uOiBpZiB0aGVyZSBpcyBvbmx5IG9uZSBoYW5kbGVyIGFuZCBpdCBhcHBsaWVzIHRvXG4gIC8vIGFsbCBlbGVtZW50cyAodGhlIFwiKlwiIENTUyBzZWxlY3RvciksIHRoZW4ganVzdCByZXR1cm4gdGhhdFxuICAvLyBoYW5kbGVyXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMSAmJiBrZXlzWzBdID09PSBTUExBVCkge1xuICAgIHJldHVybiBzZWxlY3RvcnNbU1BMQVRdO1xuICB9XG5cbiAgY29uc3QgZGVsZWdhdGVzID0ga2V5cy5yZWR1Y2UoZnVuY3Rpb24obWVtbywgc2VsZWN0b3IpIHtcbiAgICBtZW1vLnB1c2goZGVsZWdhdGUoc2VsZWN0b3IsIHNlbGVjdG9yc1tzZWxlY3Rvcl0pKTtcbiAgICByZXR1cm4gbWVtbztcbiAgfSwgW10pO1xuICByZXR1cm4gY29tcG9zZShkZWxlZ2F0ZXMpO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaWdub3JlKGVsZW1lbnQsIGZuKSB7XG4gIHJldHVybiBmdW5jdGlvbiBpZ25vcmFuY2UoZSkge1xuICAgIGlmIChlbGVtZW50ICE9PSBlLnRhcmdldCAmJiAhZWxlbWVudC5jb250YWlucyhlLnRhcmdldCkpIHtcbiAgICAgIHJldHVybiBmbi5jYWxsKHRoaXMsIGUpO1xuICAgIH1cbiAgfTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgYmVoYXZpb3I6ICAgICByZXF1aXJlKCcuL2JlaGF2aW9yJyksXG4gIGRlbGVnYXRlOiAgICAgcmVxdWlyZSgnLi9kZWxlZ2F0ZScpLFxuICBkZWxlZ2F0ZUFsbDogIHJlcXVpcmUoJy4vZGVsZWdhdGVBbGwnKSxcbiAgaWdub3JlOiAgICAgICByZXF1aXJlKCcuL2lnbm9yZScpLFxuICBrZXltYXA6ICAgICAgIHJlcXVpcmUoJy4va2V5bWFwJyksXG59O1xuIiwicmVxdWlyZSgna2V5Ym9hcmRldmVudC1rZXktcG9seWZpbGwnKTtcblxuLy8gdGhlc2UgYXJlIHRoZSBvbmx5IHJlbGV2YW50IG1vZGlmaWVycyBzdXBwb3J0ZWQgb24gYWxsIHBsYXRmb3Jtcyxcbi8vIGFjY29yZGluZyB0byBNRE46XG4vLyA8aHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL0tleWJvYXJkRXZlbnQvZ2V0TW9kaWZpZXJTdGF0ZT5cbmNvbnN0IE1PRElGSUVSUyA9IHtcbiAgJ0FsdCc6ICAgICAgJ2FsdEtleScsXG4gICdDb250cm9sJzogICdjdHJsS2V5JyxcbiAgJ0N0cmwnOiAgICAgJ2N0cmxLZXknLFxuICAnU2hpZnQnOiAgICAnc2hpZnRLZXknXG59O1xuXG5jb25zdCBNT0RJRklFUl9TRVBBUkFUT1IgPSAnKyc7XG5cbmNvbnN0IGdldEV2ZW50S2V5ID0gZnVuY3Rpb24oZXZlbnQsIGhhc01vZGlmaWVycykge1xuICB2YXIga2V5ID0gZXZlbnQua2V5O1xuICBpZiAoaGFzTW9kaWZpZXJzKSB7XG4gICAgZm9yICh2YXIgbW9kaWZpZXIgaW4gTU9ESUZJRVJTKSB7XG4gICAgICBpZiAoZXZlbnRbTU9ESUZJRVJTW21vZGlmaWVyXV0gPT09IHRydWUpIHtcbiAgICAgICAga2V5ID0gW21vZGlmaWVyLCBrZXldLmpvaW4oTU9ESUZJRVJfU0VQQVJBVE9SKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGtleTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ga2V5bWFwKGtleXMpIHtcbiAgY29uc3QgaGFzTW9kaWZpZXJzID0gT2JqZWN0LmtleXMoa2V5cykuc29tZShmdW5jdGlvbihrZXkpIHtcbiAgICByZXR1cm4ga2V5LmluZGV4T2YoTU9ESUZJRVJfU0VQQVJBVE9SKSA+IC0xO1xuICB9KTtcbiAgcmV0dXJuIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgdmFyIGtleSA9IGdldEV2ZW50S2V5KGV2ZW50LCBoYXNNb2RpZmllcnMpO1xuICAgIHJldHVybiBba2V5LCBrZXkudG9Mb3dlckNhc2UoKV1cbiAgICAgIC5yZWR1Y2UoZnVuY3Rpb24ocmVzdWx0LCBfa2V5KSB7XG4gICAgICAgIGlmIChfa2V5IGluIGtleXMpIHtcbiAgICAgICAgICByZXN1bHQgPSBrZXlzW2tleV0uY2FsbCh0aGlzLCBldmVudCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH0sIHVuZGVmaW5lZCk7XG4gIH07XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5NT0RJRklFUlMgPSBNT0RJRklFUlM7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgcHJlZml4OiBcInVzYVwiLFxufTsiLCJjb25zdCBDb21ib0JveCA9IHJlcXVpcmUoXCJAdXN3ZHMvdXN3ZHMvcGFja2FnZXMvdXNhLWNvbWJvLWJveC9zcmMvaW5kZXguanNcIik7XG5jb25zdCBEYXRlUGlja2VyID0gcmVxdWlyZShcIkB1c3dkcy91c3dkcy9wYWNrYWdlcy91c2EtZGF0ZS1waWNrZXIvc3JjL2luZGV4LmpzXCIpO1xuY29uc3QgbW9kYWwgPSByZXF1aXJlKFwiQHVzd2RzL3Vzd2RzL3BhY2thZ2VzL3VzYS1tb2RhbC9zcmMvaW5kZXguanNcIik7XG5cbi8vIEluaXRpYWxpemUgbW9kYWwgZXZlbnQgbGlzdGVuZXJzXG5Db21ib0JveC5vbigpO1xuRGF0ZVBpY2tlci5vbigpO1xubW9kYWwub24oKTtcbiJdfQ==

