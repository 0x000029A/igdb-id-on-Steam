// ==UserScript==
// @name         IGDB ID on Steam
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Display IGDB ID on Steam game page
// @author       mhashem
// @match        https://store.steampowered.com/app/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=steampowered.com
// @grant        GM.xmlHttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// ==/UserScript==

(async function() {
    'use strict';

    const steamID = window.location.href.match(/\/app\/(\d+)\//)[1];
    const igdbID = await getGameID(steamID);

    if (igdbID) {
        const igdbDiv = createIGDBDiv(igdbID);
        observeDOM('#queueActionsCtn', (parentDiv) => {
            const clearDiv = parentDiv.querySelector('div:nth-child(7)');
            parentDiv.insertBefore(igdbDiv, clearDiv);
        });
    }

    ///////////////////////////
    async function getAccessToken() {
        let accessToken = GM_getValue('twitchAccessToken', null);
        if (!accessToken) {
            const payload = new URLSearchParams({
                client_id: 'REPLACE WITH YOUR CLIENT ID',
                client_secret: 'REPLACE WITH YOUR CLIENT SECRET',
                grant_type: 'client_credentials'
            }).toString();

            accessToken = await new Promise((resolve, reject) => {
                GM.xmlHttpRequest({
                    method: 'POST',
                    url: 'https://id.twitch.tv/oauth2/token',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    data: payload,
                    onload: function(response) {
                        if (response.status === 200) {
                            const responseJson = JSON.parse(response.responseText);
                            resolve(responseJson.access_token);
                            GM_setValue('twitchAccessToken', responseJson.access_token);
                            setTimeout(() => GM_setValue('twitchAccessToken', null), 3600 * 1000); // Cache for 1 hour
                        } else {
                            console.error('Failed to get access token:', response.status, response.responseText);
                            reject(response.status);
                        }
                    },
                    onerror: function(error) {
                        console.error('Error getting access token:', error);
                        reject(error);
                    }
                });
            });
        }
        return accessToken;
    }

    async function getGameID(uid) {
        const accessToken = await getAccessToken();
        const body = `fields game; where uid = "${uid}" & category = 1;`;

        return new Promise((resolve, reject) => {
            GM.xmlHttpRequest({
                method: 'POST',
                url: 'https://api.igdb.com/v4/external_games',
                headers: {
                    'Client-ID': 'REPLACE WITH YOUR CLIENT ID',
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json',
                    'Content-Type': 'text/plain'
                },
                data: body,
                onload: function(response) {
                    if (response.status === 200) {
                        const gameDetails = JSON.parse(response.responseText)[0];
                        resolve(gameDetails.game);
                    } else {
                        console.error('Failed to get game details:', response.status, response.responseText);
                        reject(response.status);
                    }
                },
                onerror: function(error) {
                    console.error('Error getting game details:', error);
                    reject(error);
                }
            });
        });
    }

    function createIGDBDiv(igdbID) {
        const igdbDiv = document.createElement('div');
        igdbDiv.id = 'igdbDivID';
        igdbDiv.innerHTML = `<p id="igdbPID">${igdbID}</p>`;
        igdbDiv.addEventListener('click', () => {
            navigator.clipboard.writeText(igdbID);
        });

        GM_addStyle(`
            #igdbDivID {
            font-size: 15px;
                padding: 0;
                margin: 0;
                display: inline-block;
                flex-grow: 0;
                cursor: pointer;
                user-select: none;
            }
            #igdbPID {
                padding: 7px;
                color: #61bff7;
                background-color: #274157;
                border-radius: 2px;
            }
            #igdbPID:hover {
                background-image: linear-gradient(to right, #66bff2, #427d9e);
                color:white;
            }
        `);

        return igdbDiv;
    }

    function observeDOM(selector, callback) {
        const targetNode = document.querySelector(selector);

        if (targetNode) {
            callback(targetNode);
        } else {
            const observer = new MutationObserver(() => {
                const target = document.querySelector(selector);
                if (target) {
                    observer.disconnect();
                    callback(target);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

})();
