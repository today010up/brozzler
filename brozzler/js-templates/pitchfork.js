/*
 * brozzler/behaviors.d/pm-ca.js - behavior for http://pitchfork.com/festival/chicago/
 *
 * Copyright (C) 2014-2017 Internet Archive
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var umbraBehavior = {
	IDLE_TIMEOUT_SEC : 10,
	idleSince : null,
    itemsText : "",

	// https://github.com/jquery/jquery/blob/master/src/css/hiddenVisibleSelectors.js
	// n.b. returns true for elements with visibility:hidden, which occupy
	// screen real estate but are not visible, or clickable with the ui
	isVisible : function(elem) {
		return !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);
	},

	intervalFunc : function() {
		var clickedSomething = false;
		var somethingLeftBelow = false;
		var somethingLeftAbove = false;
		var cssSelector = "button.performer.full-lineup";
        var closeSelector = ".pmf-artist-modal__close-btn";
		var clickUntilTimeout = 10;

		var iframes = document.querySelectorAll("iframe");
		var documents = Array(iframes.length + 1);
		documents[0] = document;

		for (var i = 0; i < iframes.length; i++) {
			documents[i+1] = iframes[i].contentWindow.document;
		}

		for (var j = 0; j < documents.length; j++) {
            var closeTargets = documents[j].querySelectorAll(closeSelector);
			for (var i = 0; i < closeTargets.length; i++) {
				if (!this.isVisible(closeTargets[i])) {
					continue;
				}

				var where = this.aboveBelowOrOnScreen(closeTargets[i]);

				if (where == 0) {
					// console.log("clicking on " + clickTargets[i].outerHTML);
					// do mouse over event on click target
					// since some urls are requsted only on
					// this event - see
					// https://webarchive.jira.com/browse/AITFIVE-451
					var mouseOverEvent = document.createEvent('Events');
					mouseOverEvent.initEvent("mouseover",true, false);
					closeTargets[i].dispatchEvent(mouseOverEvent);
					closeTargets[i].click();
					clickedSomething = true;
					this.idleSince = null;

					break; //break from closeTargets loop, but not from iframe loop
				} else if (where > 0) {
					somethingLeftBelow = true;
				} else if (where < 0) {
					somethingLeftAbove = true;
				}
			}

			var clickTargets = documents[j].querySelectorAll(cssSelector);
			for (var i = 0; i < clickTargets.length; i++) {
				if (!this.isVisible(clickTargets[i])) {
					continue;
				}
				if (this.itemsText.indexOf(clickTargets[i].innerText) > -1) {
					continue;
				}

				var where = this.aboveBelowOrOnScreen(clickTargets[i]);

				if (where == 0) {
					// console.log("clicking on " + clickTargets[i].outerHTML);
					// do mouse over event on click target
					// since some urls are requsted only on
					// this event - see
					// https://webarchive.jira.com/browse/AITFIVE-451
					var mouseOverEvent = document.createEvent('Events');
					mouseOverEvent.initEvent("mouseover",true, false);
					clickTargets[i].dispatchEvent(mouseOverEvent);
					clickTargets[i].click();
					clickedSomething = true;
					this.idleSince = null;
					this.itemsText += clickTargets[i].innerText;

					break; //break from clickTargets loop, but not from iframe loop
				} else if (where > 0) {
					somethingLeftBelow = true;
				} else if (where < 0) {
					somethingLeftAbove = true;
				}
			}
		}

		if (!clickedSomething) {
			if (somethingLeftAbove) {
				// console.log("scrolling UP because everything on this screen has been clicked but we missed something above");
				window.scrollBy(0, -500);
				this.idleSince = null;
			} else if (somethingLeftBelow) {
				// console.log("scrolling because everything on this screen has been clicked but there's more below document.body.clientHeight="
				//				+ document.body.clientHeight);
				window.scrollBy(0, 200);
				this.idleSince = null;
			} else if (window.scrollY + window.innerHeight < document.documentElement.scrollHeight) {
				// console.log("scrolling because we're not to the bottom yet document.body.clientHeight="
				//				+ document.body.clientHeight);
				window.scrollBy(0, 200);
				this.idleSince = null;
			} else if (this.idleSince == null) {
				this.idleSince = Date.now();
			}
		}

		if (!this.idleSince) {
			this.idleSince = Date.now();
		}
	},

	start : function() {
		var that = this;
		this.intervalId = setInterval(function() {
			that.intervalFunc()
		}, 500);
	},

	isFinished : function() {
		if (this.idleSince != null) {
			var idleTimeMs = Date.now() - this.idleSince;
			if (idleTimeMs / 1000 > this.IDLE_TIMEOUT_SEC) {
				clearInterval(this.intervalId);
				return true;
			}
		}
		return false;
	},

	aboveBelowOrOnScreen : function(e) {
		var eTop = e.getBoundingClientRect().top;
		if (eTop < window.scrollY) {
			return -1; // above
		} else if (eTop > window.scrollY + window.innerHeight) {
			return 1; // below
		} else {
			return 0; // on screen
		}
	},
};

// Called from outside of this script.
var umbraBehaviorFinished = function() {
	return umbraBehavior.isFinished()
};

umbraBehavior.start();
