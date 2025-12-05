/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/@ducanh2912/next-pwa/dist/fallback.js":
/*!************************************************************!*\
  !*** ./node_modules/@ducanh2912/next-pwa/dist/fallback.js ***!
  \************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval(__webpack_require__.ts("__webpack_require__.r(__webpack_exports__);\nself.fallback=async _=>{let{destination:e,url:A}=_,s={document:false,image:\"/icons/icon-512x512.png\",audio:false,video:false,font:false}[e];return s?caches.match(s,{ignoreSearch:!0}):\"\"===e&&false&&0?0:Response.error()};//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9ub2RlX21vZHVsZXMvQGR1Y2FuaDI5MTIvbmV4dC1wd2EvZGlzdC9mYWxsYmFjay5qcyIsIm1hcHBpbmdzIjoiO0FBQUEsd0JBQXdCLElBQUksb0JBQW9CLE1BQU0sU0FBUyxLQUFxQyxPQUFPLHlCQUFrQyxPQUFPLEtBQWtDLE9BQU8sS0FBa0MsTUFBTSxLQUFpQyxDQUFDLElBQUkseUJBQXlCLGdCQUFnQixVQUFVLEtBQWlDLEVBQUUsQ0FBd0MsQ0FBQyxDQUFpRSIsInNvdXJjZXMiOlsiQzpcXFVzZXJzXFx6YXlhblxcT25lRHJpdmVcXERlc2t0b3BcXG1vc2xlbVxca29sIHlvdW0gYXBwIGFudGlncmF2aXR5XFxrb2wteW91bS1hcHBcXG5vZGVfbW9kdWxlc1xcQGR1Y2FuaDI5MTJcXG5leHQtcHdhXFxkaXN0XFxmYWxsYmFjay5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJzZWxmLmZhbGxiYWNrPWFzeW5jIF89PntsZXR7ZGVzdGluYXRpb246ZSx1cmw6QX09XyxzPXtkb2N1bWVudDpwcm9jZXNzLmVudi5fX1BXQV9GQUxMQkFDS19ET0NVTUVOVF9fLGltYWdlOnByb2Nlc3MuZW52Ll9fUFdBX0ZBTExCQUNLX0lNQUdFX18sYXVkaW86cHJvY2Vzcy5lbnYuX19QV0FfRkFMTEJBQ0tfQVVESU9fXyx2aWRlbzpwcm9jZXNzLmVudi5fX1BXQV9GQUxMQkFDS19WSURFT19fLGZvbnQ6cHJvY2Vzcy5lbnYuX19QV0FfRkFMTEJBQ0tfRk9OVF9ffVtlXTtyZXR1cm4gcz9jYWNoZXMubWF0Y2gocyx7aWdub3JlU2VhcmNoOiEwfSk6XCJcIj09PWUmJnByb2Nlc3MuZW52Ll9fUFdBX0ZBTExCQUNLX0RBVEFfXyYmQS5tYXRjaCgvXFwvX25leHRcXC9kYXRhXFwvLitcXC8uK1xcLmpzb24kL2kpP2NhY2hlcy5tYXRjaChwcm9jZXNzLmVudi5fX1BXQV9GQUxMQkFDS19EQVRBX18se2lnbm9yZVNlYXJjaDohMH0pOlJlc3BvbnNlLmVycm9yKCl9OyJdLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOlswXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///./node_modules/@ducanh2912/next-pwa/dist/fallback.js\n"));

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/trusted types policy */
/******/ 	(() => {
/******/ 		var policy;
/******/ 		__webpack_require__.tt = () => {
/******/ 			// Create Trusted Type policy if Trusted Types are available and the policy doesn't exist yet.
/******/ 			if (policy === undefined) {
/******/ 				policy = {
/******/ 					createScript: (script) => (script)
/******/ 				};
/******/ 				if (typeof trustedTypes !== "undefined" && trustedTypes.createPolicy) {
/******/ 					policy = trustedTypes.createPolicy("nextjs#bundler", policy);
/******/ 				}
/******/ 			}
/******/ 			return policy;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/trusted types script */
/******/ 	(() => {
/******/ 		__webpack_require__.ts = (script) => (__webpack_require__.tt().createScript(script));
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/react refresh */
/******/ 	(() => {
/******/ 		if (__webpack_require__.i) {
/******/ 		__webpack_require__.i.push((options) => {
/******/ 			const originalFactory = options.factory;
/******/ 			options.factory = (moduleObject, moduleExports, webpackRequire) => {
/******/ 				const hasRefresh = typeof self !== "undefined" && !!self.$RefreshInterceptModuleExecution$;
/******/ 				const cleanup = hasRefresh ? self.$RefreshInterceptModuleExecution$(moduleObject.id) : () => {};
/******/ 				try {
/******/ 					originalFactory.call(this, moduleObject, moduleExports, webpackRequire);
/******/ 				} finally {
/******/ 					cleanup();
/******/ 				}
/******/ 			}
/******/ 		})
/******/ 		}
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	
/******/ 	// noop fns to prevent runtime errors during initialization
/******/ 	if (typeof self !== "undefined") {
/******/ 		self.$RefreshReg$ = function () {};
/******/ 		self.$RefreshSig$ = function () {
/******/ 			return function (type) {
/******/ 				return type;
/******/ 			};
/******/ 		};
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval-source-map devtool is used.
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__["./node_modules/@ducanh2912/next-pwa/dist/fallback.js"](0, __webpack_exports__, __webpack_require__);
/******/ 	
/******/ })()
;