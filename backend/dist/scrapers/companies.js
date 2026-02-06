"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companies = void 0;
exports.companies = [
    {
        name: "Airbnb",
        url: "https://careers.airbnb.com/positions/",
        selectors: {
            card: ' a[href^="/positions/"]:not([href*="#"])'
            // title = anchor text
            // location not available on listing page
        }
    }
];
