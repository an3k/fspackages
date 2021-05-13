class WT_G3x5_NavMapDisplayPaneFlightPlanTextInset {
    /**
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetHTMLElement} htmlElement
     * @param {WT_G3x5_BaseInstrument} instrument
     * @param {WT_G3x5_NavMapDisplayFlightPlanTextDistanceSetting} distanceSetting
     */
    constructor(htmlElement, instrument, distanceSetting) {
        this._htmlElement = htmlElement;
        this._instrument = instrument;
        this._distanceSetting = distanceSetting;

        this._initHTMLElement();
        this._initState();
        this._initSettings();
    }

    _initHTMLElement() {
        this.htmlElement.setInstrument(this._instrument);
    }

    _initState() {
        /**
         * @type {WT_G3x5_NavMapDisplayPaneFlightPlanInsetState}
         */
         this._state = {
            _unitsModel: new WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetUnitsModel(this._instrument.unitsSettingModel),
            _activeLeg: null,

            get unitsModel() {
                return this._unitsModel;
            },

            get activeLeg() {
                return this._activeLeg;
            }
        };
    }

    _initSettings() {
        this._distanceSetting.init();
        this._distanceSetting.addListener(this._onDistanceSettingChanged.bind(this));
        this.htmlElement.setDistanceCumulative(this._distanceSetting.isCumulative);
    }

    /**
     * @readonly
     * @type {WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetHTMLElement}
     */
    get htmlElement() {
        return this._htmlElement;
    }

    /**
     *
     * @param {WT_G3x5_DisplayPane.Size} size
     */
    setSize(size) {
        this.htmlElement.setSize(size);
    }

    _onDistanceSettingChanged(setting, newValue, oldValue) {
        this.htmlElement.setDistanceCumulative(newValue);
    }

    wake() {
        this.htmlElement.setFlightPlan(this._instrument.flightPlanManagerWT.activePlan);
    }

    sleep() {
        this.htmlElement.setFlightPlan(null);
    }

    _updateState() {
        this._state._activeLeg = this._instrument.flightPlanManagerWT.getActiveLeg(true);
    }

    update() {
        this._updateState();
        this.htmlElement.update(this._state);
    }
}

/**
 * @typedef WT_G3x5_NavMapDisplayPaneFlightPlanInsetState
 * @property {readonly WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetUnitsModel} unitsModel
 * @property {readonly WT_FlightPlanLeg} activeLeg
 */

class WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetUnitsModel extends WT_G3x5_UnitsSettingModelAdapter {
    /**
     * @param {WT_G3x5_UnitsSettingModel} unitsSettingModel
     */
    constructor(unitsSettingModel) {
        super(unitsSettingModel);

        this._initListeners();
        this._initModel();
    }

    /**
     * @readonly
     * @type {WT_NavAngleUnit}
     */
    get bearingUnit() {
        return this._bearingUnit;
    }

    /**
     * @readonly
     * @type {WT_Unit}
     */
    get distanceUnit() {
        return this._distanceUnit;
    }

    /**
     * @readonly
     * @type {WT_Unit}
     */
    get altitudeUnit() {
        return this._altitudeUnit;
    }

    _updateBearing() {
        this._bearingUnit = this.unitsSettingModel.navAngleSetting.getNavAngleUnit();
    }

    _updateDistance() {
        this._distanceUnit = this.unitsSettingModel.distanceSpeedSetting.getDistanceUnit();
    }

    _updateAltitude() {
        this._altitudeUnit = this.unitsSettingModel.altitudeSetting.getAltitudeUnit();
    }
}


class WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetHTMLElement extends HTMLElement {
    constructor() {
        super();

        this.attachShadow({mode: "open"});
        this.shadowRoot.appendChild(this._getTemplate().content.cloneNode(true));

        this._flightPlanListener = this._onFlightPlanChanged.bind(this);

        /**
         * @type {WT_G3x5_BaseInstrument}
         */
        this._instrument = null;
        /**
         * @type {WT_FlightPlan}
         */
        this._flightPlan = null;
        this._size = WT_G3x5_DisplayPane.Size.OFF;
        this._isDistanceCumulative = false;
        /**
         * @type {WT_G3x5_TSCFlightPlanRowHTMLElement[]}
         */
        this._visibleRows = [];
        this._activeArrowShow = null;
        this._activeArrowFrom = 0;
        this._activeArrowTo = 0;
        this._needRedrawFlightPlan = false;
        this._isInit = false;
    }

    _getTemplate() {
        return WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetHTMLElement.TEMPLATE;
    }

    async _defineChildren() {
        this._wrapper = new WT_CachedElement(this.shadowRoot.querySelector(`#wrapper`));

        this._disTitle = this.shadowRoot.querySelector(`#distitle`);
        this._rowsContainer = this.shadowRoot.querySelector(`#rowscontainer`);
        this._activeArrowStemRect = this.shadowRoot.querySelector(`#activearrowstem rect`);
        this._activeArrowHead = this.shadowRoot.querySelector(`#activearrowhead`);
    }

    _initRowRecycler() {
        this._rowRecycler = new WT_CustomHTMLElementRecycler(this._rowsContainer, WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement, (element => element.setInstrument(this._instrument)).bind(this));
    }

    async _connectedCallbackHelper() {
        await this._defineChildren();
        this._initRowRecycler();
        this._isInit = true;
        if (this._flightPlan) {
            this._updateFromFlightPlan();
        }
        this._updateFromSize();
        this._updateFromDistanceCumulative();
        this._updateFromActiveArrowShow();
        this._updateFromActiveArrowPosition();
    }

    connectedCallback() {
        this._connectedCallbackHelper();
    }

    /**
     *
     * @param {WT_G3x5_BaseInstrument} instrument
     */
    setInstrument(instrument) {
        if (!instrument || this._instrument) {
            return;
        }

        this._instrument = instrument;
    }

    _cleanUpFlightPlanRenderer() {
        this._flightPlanRenderer = null;
    }

    _cleanUpFlightPlanListener() {
        this._flightPlan.removeListener(this._flightPlanListener);
    }

    _cleanUpRows() {
        this._rowRecycler.recycleAll();
        this._visibleRows = [];
    }

    _cleanUpFlightPlan() {
        if (!this._flightPlan) {
            return;
        }

        this._cleanUpFlightPlanRenderer();
        this._cleanUpFlightPlanListener();
        this._cleanUpRows();
    }

    _initFlightPlanRenderer() {
        this._flightPlanRenderer = new WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRenderer(this._flightPlan);
    }

    _initFlightPlanListener() {
        this._flightPlan.addListener(this._flightPlanListener);
    }

    _updateFromFlightPlan() {
        if (!this._flightPlan) {
            return;
        }

        this._initFlightPlanRenderer();
        this._initFlightPlanListener();
        this._drawFlightPlan();
    }

    /**
     *
     * @param {WT_FlightPlan} flightPlan
     */
    setFlightPlan(flightPlan) {
        if (flightPlan === this._flightPlan) {
            return;
        }

        this._cleanUpFlightPlan();
        this._flightPlan = flightPlan;
        if (this._isInit) {
            this._updateFromFlightPlan();
        }
    }

    _updateFromSize() {
        this._wrapper.setAttribute("size", `${WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetHTMLElement.SIZE_ATTRIBUTES[this._size]}`);
        this._visibleRows.forEach(row => row.setSize(this._size), this);
    }

    /**
     *
     * @param {WT_G3x5_DisplayPane.Size} size
     */
    setSize(size) {
        if (this._size === size) {
            return;
        }

        this._size = size;
        if (this._isInit) {
            this._updateFromSize();
        }
    }

    _updateFromDistanceCumulative() {
        this._disTitle.innerHTML = this._isDistanceCumulative ? "Cum<br>DIS" : "Leg<br>DIS";
        this._visibleRows.forEach(row => row.setDistanceCumulative(this._isDistanceCumulative), this);
    }

    /**
     *
     * @param {Boolean} isCumulative
     */
    setDistanceCumulative(isCumulative) {
        if (this._isDistanceCumulative === isCumulative) {
            return;
        }

        this._isDistanceCumulative = isCumulative;
        if (this._isInit) {
            this._updateFromDistanceCumulative();
        }
    }

    _initRow(row) {
        row.setSize(this._size);
        row.setDistanceCumulative(this._isDistanceCumulative);
        this._visibleRows.push(row);
    }

    clearRows() {
        if (this._isInit) {
            this._cleanUpRows();
        }
    }

    requestRow() {
        if (this._isInit) {
            let row = this._rowRecycler.request();
            this._initRow(row);
            return row;
        } else {
            return null;
        }
    }

    _updateFromActiveArrowShow() {
        this._wrapper.setAttribute("activearrow-show", `${this._activeArrowShow}`);
    }

    setActiveArrowVisible(value) {
        this._activeArrowShow = value;
        if (this._isInit) {
            this._updateFromActiveArrowShow();
        }
    }

    _updateFromActiveArrowPosition() {
        let top = Math.min(this._activeArrowFrom, this._activeArrowTo);
        let height = Math.abs(this._activeArrowTo - this._activeArrowFrom);

        this._activeArrowStemRect.setAttribute("y", `${top}`);
        this._activeArrowStemRect.setAttribute("height", `${height}`);
        this._activeArrowHead.style.transform = `translateY(${this._activeArrowTo}px) rotateX(0deg)`;
    }

    moveActiveArrow(from, to) {
        this._activeArrowFrom = from;
        this._activeArrowTo = to;
        if (this._isInit) {
            this._updateFromActiveArrowPosition();
        }
    }

    _drawRows(activeLeg) {
        this._flightPlanRenderer.draw(this, activeLeg);
    }

    _drawFlightPlan(activeLeg) {
        this._drawRows(activeLeg);
    }

    _onFlightPlanChanged(event) {
        if (event.types !== WT_FlightPlanEvent.Type.LEG_ALTITUDE_CHANGED) {
            this._drawFlightPlan();
        } else {
            this._flightPlanRenderer.updateAltitudeConstraint(event.changedConstraint.leg);
        }
    }

    _updateFlightPlanRenderer(state) {
        this._flightPlanRenderer.update(this, state);
    }

    _doUpdate(state) {
        this._updateFlightPlanRenderer(state);
    }

    /**
     *
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanInsetState} state
     */
    update(state) {
        if (!this._isInit || !this._flightPlan) {
            return;
        }

        this._doUpdate(state);
    }
}
WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetHTMLElement.SIZE_ATTRIBUTES = [
    "off",
    "full",
    "half"
];
WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetHTMLElement.NAME = "wt-navmapdisplaypane-flightplantextinset";
WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetHTMLElement.TEMPLATE = document.createElement("template");
WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetHTMLElement.TEMPLATE.innerHTML = `
    <style>
        :host {
            display: block;
            width: 100%;
            height: 100%;
            border-radius: 3px;
            background: linear-gradient(#1f3445, black 25px);
            border: 3px solid var(--wt-g3x5-bordergray);
        }

        #wrapper {
            position: absolute;
            left: var(--flightplantextinset-padding-left, 0.2em);
            top: var(--flightplantextinset-padding-top, 0.1em);
            width: calc(100% - var(--flightplantextinset-padding-left, 0.2em) - var(--flightplantextinset-padding-right, 0.2em));
            height: calc(100% - var(--flightplantextinset-padding-top, 0.1em) - var(--flightplantextinset-padding-bottom, 0.1em));
            display: grid;
            grid-template-rows: calc(var(--flightplantextinset-title-font-size, 0.85em) * 1) 1fr;
            grid-template-columns: 100%;
            grid-gap: 0 var(--flightplantextinset-title-margin-bottom, 0);
            --flightplantextinset-table-grid-columns: var(--flightplantextinset-table-grid-columns-full, 2.5fr 0.5fr 1fr 1fr 0.75fr 0.5fr 0.75fr);
        }
        #wrapper[size="half"] {
            --flightplantextinset-table-grid-columns: var(--flightplantextinset-table-grid-columns-half, 1.5fr 0.6fr 1fr 1.25fr);
        }
            #title {
                color: white;
                text-align: left;
                align-self: center;
                font-size: var(--flightplantextinset-title-font-size, 0.85em);
            }
            #table {
                position: relative;
                width: 100%;
                height: 100%;
                display: grid;
                grid-template-columns: 100%;
                grid-template-rows: calc(var(--flightplantextinset-table-header-font-size, 0.75em) * 2) 1fr;
                grid-gap: var(--flightplantextinset-table-header-margin-bottom, 0.1em) 0;
            }
                #header {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    display: grid;
                    grid-template-rows: 100%;
                    grid-template-columns: var(--flightplantextinset-table-grid-columns);
                    grid-gap: 0 var(--flightplan-table-grid-column-gap, 0.2em);
                    align-items: end;
                    justify-items: center;
                    border-bottom: solid 3px var(--wt-g3x5-bordergray);
                    font-size: var(--flightplantextinset-table-header-font-size, 0.75em);
                    line-height: 1.2em;
                    color: white;
                }
                    .fullSizeOnlyTitle {
                        display: none;
                    }
                    #wrapper[size="full"] .fullSizeOnlyTitle {
                        display: block;
                    }
                #rows {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                }
                    #rowscontainer {
                        position: relative;
                        width: 100%;
                        height: 100%;
                        display: flex;
                        flex-flow: column nowrap;
                        align-items: stretch;
                    }
                        wt-navmapdisplaypane-flightplantextinset-row {
                            height: calc((100% - 4 * var(--flightplantextinset-table-row-margin-vertical, 0.1em)) / 5);
                            margin-bottom: var(--flightplantextinset-table-row-margin-vertical, 0.1em);
                        }
                    .activeArrow {
                        display: none;
                    }
                    #wrapper[activearrow-show="true"] .activeArrow {
                        display: block;
                    }
                    #activearrowstem {
                        position: absolute;
                        left: var(--flightplantextinset-table-arrow-left, 0.1em);
                        top: 0%;
                        width: calc(100% - var(--flightplantextinset-table-arrow-right, calc(100% - 1em)) - var(--flightplantextinset-table-arrow-left, 0.1em) - var(--flightplantextinset-table-arrow-head-size, 0.5em) / 2);
                        height: 100%;
                        transform: rotateX(0deg);
                    }
                        #activearrowstem rect {
                            stroke-width: var(--flightplantextinset-table-arrow-stroke-width, 0.2em);
                            stroke: var(--wt-g3x5-purple);
                            fill: transparent;
                            transform: translate(calc(var(--flightplantextinset-table-arrow-stroke-width, 0.2em) / 2), 0);
                        }
                    #activearrowhead {
                        position: absolute;
                        right: var(--flightplantextinset-table-arrow-right, calc(100% - 1em));
                        top: calc(-1 * var(--flightplantextinset-table-arrow-head-size, 0.5em) / 2);
                        width: var(--flightplantextinset-table-arrow-head-size, 0.5em);
                        height: var(--flightplantextinset-table-arrow-head-size, 0.5em);
                        transform: rotateX(0deg);
                    }
                        #activearrowhead polygon {
                            fill: var(--wt-g3x5-purple);
                        }
    </style>
    <div id="wrapper">
        <div id="title">Active Flight Plan</div>
        <div id="table">
            <div id="header">
                <div class="title"></div>
                <div id="dtktitle" class="title">DTK</div>
                <div id="distitle" class="title"></div>
                <div id="alttitle" class="title">ALT</div>
                <div id="fueltitle" class="title fullSizeOnlyTitle">Fuel<br>REM</div>
                <div id="etetitle" class="title fullSizeOnlyTitle">Leg<br>ETE</div>
                <div id="etatitle" class="title fullSizeOnlyTitle">ETA</div>
            </div>
            <div id="rows">
                <div id="rowscontainer"></div>
                <svg id="activearrowstem" class="activeArrow">
                    <rect x="0" y="0" rx="2" ry="2" width="1000" height="0" />
                </svg>
                <svg id="activearrowhead" class="activeArrow" viewBox="0 0 86.6 100">
                    <polygon points="0,0 86.6,50 0,100" />
                </svg>
            </div>
        </div>
    </div>
`;

customElements.define(WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetHTMLElement.NAME, WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetHTMLElement);

class WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement extends HTMLElement {
    constructor() {
        super();

        this.attachShadow({mode: "open"});
        this.shadowRoot.appendChild(this._getTemplate().content.cloneNode(true));

        this._mode = WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement.Mode.NONE;
        this._isInit = false;

        this._initChildren();
    }

    _getTemplate() {
        return WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement.TEMPLATE;
    }

    _initLeg() {
        this._leg = new WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowLegHTMLElement();
        this._leg.id = WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement.MODE_IDS[WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement.Mode.LEG];
        this._leg.classList.add("mode");
        this._modeHTMLElements.push(this._leg);
    }

    _initHeader() {
        this._header = new WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHeaderHTMLElement();
        this._header.id = WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement.MODE_IDS[WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement.Mode.HEADER];
        this._header.classList.add("mode");
        this._modeHTMLElements.push(this._header);
    }

    _initAirwayFooter() {
        this._airwayFooter = new WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowAirwaySequenceFooterHTMLElement();
        this._airwayFooter.id = WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement.MODE_IDS[WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement.Mode.AIRWAY_FOOTER];
        this._airwayFooter.classList.add("mode");
        this._modeHTMLElements.push(this._airwayFooter);
    }

    _initChildren() {
        this._modeHTMLElements = [null];
        this._initLeg();
        this._initHeader();
        this._initAirwayFooter();
    }

    _appendChildren() {
        this._modeHTMLElements.forEach(element => {
            if (element) {
                this.shadowRoot.appendChild(element);
            }
        });
    }

    async _connectedCallbackHelper() {
        this._appendChildren();
        this._isInit = true;
    }

    connectedCallback() {
        this._connectedCallbackHelper();
    }

    _initFromInstrument() {
        this._leg.setInstrument(this._instrument);
        this._airwayFooter.setInstrument(this._instrument);
    }

    /**
     *
     * @param {WT_G3x5_BaseInstrument} instrument
     */
    setInstrument(instrument) {
        if (!instrument || this._instrument) {
            return;
        }

        this._instrument = instrument;
        this._initFromInstrument();
    }

    /**
     *
     * @param {WT_G3x5_DisplayPane.Size} size
     */
    setSize(size) {
        this._modeHTMLElements.forEach(element => {
            if (element) {
                element.setSize(size);
            }
        });
    }

    /**
     *
     * @param {Boolean} isCumulative
     */
    setDistanceCumulative(isCumulative) {
        this._modeHTMLElements.forEach(element => {
            if (element) {
                element.setDistanceCumulative(isCumulative);
            }
        });
    }

    /**
     *
     * @returns {WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement.Mode}
     */
    getMode() {
        return this._mode;
    }

    /**
     *
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement.Mode} mode
     */
    setMode(mode) {
        if (this._mode !== mode) {
            this.setAttribute("mode", WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement.MODE_IDS[mode]);
            this._mode = mode;
        }
    }

    /**
     *
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement.Mode} mode
     * @return {HTMLElement}
     */
    getModeHTMLElement(mode) {
        return this._modeHTMLElements[mode];
    }

    /**
     *
     * @return {HTMLElement}
     */
    getActiveModeHTMLElement() {
        return this._modeHTMLElements[this._mode];
    }

    /**
     *
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanInsetState} state
     */
    _doUpdate(state) {
        let activeModeHTMLElement = this.getActiveModeHTMLElement();
        if (activeModeHTMLElement) {
            activeModeHTMLElement.update(state);
        }
    }

    /**
     *
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanInsetState} state
     */
    update(state) {
        if (!this._isInit) {
            return;
        }

        this._doUpdate(state);
    }
}
/**
 * @enum {Number}
 */
WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement.Mode = {
    NONE: 0,
    LEG: 1,
    HEADER: 2,
    AIRWAY_FOOTER: 3
}
WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement.MODE_IDS = [
    "",
    "leg",
    "header",
    "airwayfooter"
];
WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement.NAME = "wt-navmapdisplaypane-flightplantextinset-row";
WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement.TEMPLATE = document.createElement("template");
WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement.TEMPLATE.innerHTML = `
    <style>
        :host {
            display: block;
            position: relative;
        }

        .mode {
            display: none;
        }

        :host([mode=${WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement.MODE_IDS[WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement.Mode.LEG]}]) #leg {
            display: block;
        }
        :host([mode=${WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement.MODE_IDS[WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement.Mode.HEADER]}]) #header {
            display: block;
        }
        :host([mode=${WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement.MODE_IDS[WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement.Mode.AIRWAY_FOOTER]}]) #airwayfooter {
            display: block;
        }
    </style>
`;

customElements.define(WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement.NAME, WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement);

class WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowLegHTMLElement extends HTMLElement {
    constructor() {
        super();

        this.attachShadow({mode: "open"});
        this.shadowRoot.appendChild(this._getTemplate().content.cloneNode(true));

        /**
         * @type {WT_G3x5_BaseInstrument}
         */
        this._instrument = null;
        this._size = WT_G3x5_DisplayPane.Size.OFF;
        this._isDistanceCumulative = false;
        /**
         * @type {WT_FlightPlanLeg}
         */
        this._leg = null;
        this._indent = 0;
        this._bearingUnit = null;
        this._distanceUnit = null;
        this._altitudeUnit = null;
        this._needUpdateDataFields = false;
        this._dynamicDataFieldUpdateTime = 0;

        this._isActive = false;
        this._isInit = false;

        this._tempNM = WT_Unit.NMILE.createNumber(0);
        this._tempKnots = WT_Unit.KNOT.createNumber(0);
        this._tempGallons = WT_Unit.GALLON.createNumber(0);
        this._tempGPH = WT_Unit.GPH.createNumber(0);
    }

    _getTemplate() {
        return WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowLegHTMLElement.TEMPLATE;
    }

    /**
     * @readonly
     * @type {Boolean}
     */
    get isInitialized() {
        return this._isInit;
    }

    /**
     * @readonly
     * @type {WT_FlightPlanLeg}
     */
    get leg() {
        return this._leg;
    }

    async _defineChildren() {
        this._wrapper = this.shadowRoot.querySelector(`#wrapper`);

        this._waypointDisplay = this.shadowRoot.querySelector(`#waypoint`);

        [
            this._altitudeConstraint,
            this._dtkField,
            this._disField,
            this._fuelField,
            this._eteField,
            this._etaField
        ] = await Promise.all([
            WT_CustomElementSelector.select(this.shadowRoot, `#altconstraint`, WT_G3x5_NavMapDisplayPaneFlightPlanInsetLegAltitudeConstraintHTMLElement),
            WT_CustomElementSelector.select(this.shadowRoot, `#dtk`, WT_G3x5_NavDataInfoView),
            WT_CustomElementSelector.select(this.shadowRoot, `#dis`, WT_G3x5_NavDataInfoView),
            WT_CustomElementSelector.select(this.shadowRoot, `#fuel`, WT_G3x5_NavDataInfoView),
            WT_CustomElementSelector.select(this.shadowRoot, `#ete`, WT_G3x5_NavDataInfoView),
            WT_CustomElementSelector.select(this.shadowRoot, `#eta`, WT_G3x5_NavDataInfoView),
        ]);
    }

    async _connectedCallbackHelper() {
        await this._defineChildren();
        this._isInit = true;
        this._updateFromSize();
        this._updateFromDistanceCumulative();
        this._updateFromLeg();
        this._updateFromIndent();
        this._updateFromActive();
    }

    connectedCallback() {
        this._connectedCallbackHelper();
    }

    /**
     *
     * @param {WT_NumberUnit} value
     */
    _updateCumulativeDistance(value) {
        value.set(this.leg ? this.leg.cumulativeDistance : NaN);
    }

    /**
     *
     * @param {WT_NumberUnit} value
     */
    _updateLegDistance(value) {
        value.set(this.leg ? this.leg.distance : NaN);
    }

    /**
     *
     * @param {WT_NumberUnit} value
     */
    _updateDTK(value) {
        if (this.leg) {
            value.unit.setLocation(this.leg.desiredTrack.unit.location);
            value.set(this.leg.desiredTrack);
        } else {
            value.set(NaN);
        }
    }

    /**
     *
     * @param {WT_Time} time
     */
    _updateETA(time) {
        if (this.leg) {
            let fpm = this._instrument.flightPlanManagerWT;
            let activeLeg = fpm.getActiveLeg(true);
            if (activeLeg && activeLeg.flightPlan === this.leg.flightPlan && activeLeg.index <= this.leg.index) {
                let distanceNM = this.leg.cumulativeDistance.asUnit(WT_Unit.NMILE) - activeLeg.cumulativeDistance.asUnit(WT_Unit.NMILE) + fpm.distanceToActiveLegFix(true, this._tempNM).number;
                let speedKnots = this._instrument.airplane.navigation.groundSpeed(this._tempKnots).number;
                if (speedKnots > 0) {
                    let ete = distanceNM / speedKnots;
                    time.set(this._instrument.time);
                    time.add(ete, WT_Unit.HOUR);
                    return;
                }
            }
        }
        time.set(NaN);
    }

    /**
     *
     * @param {WT_NumberUnit} value
     */
    _updateETE(value) {
        if (this.leg) {
            let distanceNM = this.leg.distance.asUnit(WT_Unit.NMILE);
            let speedKnots = this._instrument.airplane.navigation.groundSpeed(this._tempKnots).number;
            value.set(speedKnots > 0 ? (distanceNM / speedKnots) : NaN, WT_Unit.HOUR);
        } else {
            value.set(NaN);
        }
    }

    /**
     *
     * @param {WT_NumberUnit} value
     */
    _updateFuelRemaining(value) {
        if (this.leg) {
            let fpm = this._instrument.flightPlanManagerWT;
            let activeLeg = fpm.getActiveLeg(true);
            if (activeLeg && activeLeg.flightPlan === this.leg.flightPlan && activeLeg.index <= this.leg.index) {
                let distanceToLeg = this.leg.cumulativeDistance.asUnit(WT_Unit.NMILE) - activeLeg.cumulativeDistance.asUnit(WT_Unit.NMILE) + fpm.distanceToActiveLegFix(true, this._tempNM).number;
                let speedKnots = this._instrument.airplane.navigation.groundSpeed(this._tempKnots).number;
                let currentFuelGal = this._instrument.airplane.engineering.fuelOnboard(this._tempGallons).number;
                let fuelFlowGPH = this._instrument.airplane.engineering.fuelFlowTotal(this._tempGPH).number;
                value.set((speedKnots > 0 && fuelFlowGPH > 0) ? (currentFuelGal - distanceToLeg / speedKnots * fuelFlowGPH) : NaN, WT_Unit.GALLON);
                return;
            }
        }
        value.set(NaN);
    }

    _initNavDataInfos() {
        this._dtkInfo = new WT_G3x5_NavDataInfoNumber({shortName: "", longName: "DTK"}, new WT_NumberUnitModelAutoUpdated(new WT_NavAngleUnit(true), {updateValue: this._updateDTK.bind(this)}));
        this._cumDisInfo = new WT_G3x5_NavDataInfoNumber({shortName: "", longName: "CUM"}, new WT_NumberUnitModelAutoUpdated(WT_Unit.NMILE, {updateValue: this._updateCumulativeDistance.bind(this)}));
        this._legDisInfo = new WT_G3x5_NavDataInfoNumber({shortName: "", longName: "DIS"}, new WT_NumberUnitModelAutoUpdated(WT_Unit.NMILE, {updateValue: this._updateLegDistance.bind(this)}));
        this._fuelInfo = new WT_G3x5_NavDataInfoNumber({shortName: "", longName: "FUEL"}, new WT_NumberUnitModelAutoUpdated(WT_Unit.GALLON, {updateValue: this._updateFuelRemaining.bind(this)}));
        this._eteInfo = new WT_G3x5_NavDataInfoNumber({shortName: "", longName: "ETE"}, new WT_NumberUnitModelAutoUpdated(WT_Unit.SECOND, {updateValue: this._updateETE.bind(this)}));
        this._etaInfo = new WT_G3x5_NavDataInfoTime({shortName: "", longName: "ETA"}, new WT_G3x5_TimeModel(new WT_TimeModelAutoUpdated("", {updateTime: this._updateETA.bind(this)}), this._instrument.avionicsSystemSettingModel.timeFormatSetting, this._instrument.avionicsSystemSettingModel.timeLocalOffsetSetting));
    }

    _initNavDataFormatters() {
        let bearingOpts = {
            precision: 1,
            unitSpaceBefore: false
        };
        let bearingFormatter = new WT_NumberFormatter(bearingOpts);

        let distanceOpts = {
            precision: 0.1,
            maxDigits: 3,
            unitSpaceBefore: false,
            unitCaps: true
        }
        let distanceFormatter = new WT_NumberFormatter(distanceOpts);

        let volumeOpts = {
            precision: 0.1,
            maxDigits: 3,
            unitSpaceBefore: false,
            unitCaps: true
        }
        let volumeFormatter = new WT_NumberFormatter(volumeOpts);

        let durationOpts = {
            timeFormat: WT_TimeFormatter.Format.HH_MM_OR_MM_SS,
            delim: WT_TimeFormatter.Delim.COLON_OR_CROSS
        }
        let durationFormatter = new WT_TimeFormatter(durationOpts);

        this._bearingInfoFormatter = new WT_G3x5_NavDataInfoViewDegreeFormatter(bearingFormatter);
        this._distanceInfoFormatter = new WT_G3x5_NavDataInfoViewNumberFormatter(distanceFormatter);
        this._volumeInfoFormatter = new WT_G3x5_NavDataInfoViewNumberFormatter(volumeFormatter);
        this._durationInfoFormatter = new WT_G3x5_NavDataInfoViewDurationFormatter(durationFormatter, "__:__");
        this._timeInfoFormatter = new WT_G3x5_NavDataInfoViewTimeFormatter();
    }

    _initFromInstrument() {
        this._initNavDataInfos();
        this._initNavDataFormatters();
    }

    /**
     *
     * @param {AS3000_TSC} instrument
     */
    setInstrument(instrument) {
        if (!instrument || this._instrument) {
            return;
        }

        this._instrument = instrument;
        this._initFromInstrument();
    }

    _updateFromSize() {
        this._wrapper.setAttribute("size", `${WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetHTMLElement.SIZE_ATTRIBUTES[this._size]}`);
        this._needUpdateDataFields = true;
    }

    /**
     *
     * @param {WT_G3x5_DisplayPane.Size} size
     */
    setSize(size) {
        if (this._size === size) {
            return;
        }

        this._size = size;
        if (this._isInit) {
            this._updateFromSize();
        }
    }

    _updateFromDistanceCumulative() {
        this._needUpdateDataFields = true;
    }

    /**
     *
     * @param {WT_G3x5_DisplayPane.Size} isCumulative
     */
    setDistanceCumulative(isCumulative) {
        if (this._isDistanceCumulative === isCumulative) {
            return;
        }

        this._isDistanceCumulative = isCumulative;
        if (this._isInit) {
            this._updateFromDistanceCumulative();
        }
    }

    _clearWaypoint() {
        this._waypointDisplay.textContent = "";
    }

    _clearAltitudeConstraint() {
        this._altitudeConstraint.update(null, this._altitudeUnit);
    }

    _updateWaypointFromLeg() {
        this._waypointDisplay.textContent = this._leg.fix.ident;
    }

    _updateAltitudeConstraintFromLeg() {
        this._altitudeConstraint.update(this._leg.altitudeConstraint, this._altitudeUnit);
    }

    _updateAllDataFields() {
        this._dtkField.update(this._dtkInfo, this._bearingInfoFormatter);
        this._disField.update(this._isDistanceCumulative ? this._cumDisInfo : this._legDisInfo, this._distanceInfoFormatter);
        this._updateDynamicDataFields();
        this._needUpdateDataFields = false;
    }

    _updateFromLeg() {
        if (this._leg) {
            this._updateWaypointFromLeg();
            this._updateAltitudeConstraintFromLeg();
        } else {
            this._clearWaypoint();
            this._clearAltitudeConstraint();
        }
        this._updateAllDataFields();
    }

    /**
     *
     * @param {WT_FlightPlanLeg} leg
     */
    setLeg(leg) {
        this._leg = leg;
        if (this._isInit) {
            this._updateFromLeg();
        }
    }

    _updateFromIndent() {
        this._waypointDisplay.style.paddingLeft = `${this._indent * 0.5}em`;
    }

    /**
     *
     * @param {Number} indent
     */
    setIndent(indent) {
        this._indent = indent;
        if (this._isInit) {
            this._updateFromIndent();
        }
    }

    _updateFromActive() {
        this._wrapper.setAttribute("active", `${this._isActive}`);
    }

    setActive(value) {
        if (value === this._isActive) {
            return;
        }

        this._isActive = value;
        if (this._isInit) {
            this._updateFromActive();
        }
    }

    updateAltitudeConstraint() {
        this._updateAltitudeConstraintFromLeg();
    }

    /**
     *
     * @param {WT_G3x5_TSCFlightPlanUnitsModel} unitsModel
     * @returns {Boolean}
     */
    _updateDataFieldUnits(unitsModel) {
        if (!unitsModel.bearingUnit.equals(this._bearingUnit)) {
            this._bearingUnit = unitsModel.bearingUnit;
            this._dtkInfo.setDisplayUnit(this._bearingUnit);
            this._needUpdateDataFields = true;
        }
        if (!unitsModel.distanceUnit.equals(this._distanceUnit)) {
            this._distanceUnit = unitsModel.distanceUnit;
            this._legDisInfo.setDisplayUnit(this._distanceUnit);
            this._cumDisInfo.setDisplayUnit(this._distanceUnit);
            this._needUpdateDataFields = true;
        }
    }

    _updateDynamicDataFields() {
        if (this._size !== WT_G3x5_DisplayPane.Size.FULL) {
            return;
        }

        this._fuelField.update(this._fuelInfo, this._volumeInfoFormatter);
        this._eteField.update(this._eteInfo, this._durationInfoFormatter);
        this._etaField.update(this._etaInfo, this._timeInfoFormatter);

        this._dynamicDataFieldUpdateTime = this._instrument.currentTimeStamp;
    }

    /**
     *
     * @param {WT_G3x5_TSCFlightPlanUnitsModel} unitsModel
     */
    _updateDataFields(unitsModel) {
        this._updateDataFieldUnits(unitsModel);
        if (this._needUpdateDataFields) {
            this._updateAllDataFields();
        } else if (this._instrument.currentTimeStamp - this._dynamicDataFieldUpdateTime >= WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowLegHTMLElement.DYNAMIC_DATA_FIELD_UPDATE_INTERVAL) {
            this._updateDynamicDataFields();
        }
    }

    /**
     *
     * @param {WT_G3x5_TSCFlightPlanUnitsModel} unitsModel
     */
    _updateAltitudeConstraint(unitsModel) {
        if (!unitsModel.altitudeUnit.equals(this._altitudeUnit)) {
            this._altitudeUnit = unitsModel.altitudeUnit;
            this._updateAltitudeConstraintFromLeg();
        }
    }

    /**
     *
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanInsetState} state
     */
    update(state) {
        if (!this._isInit || !this._leg) {
            return;
        }

        this._updateDataFields(state.unitsModel);
        this._updateAltitudeConstraint(state.unitsModel);
    }
}
WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowLegHTMLElement.DYNAMIC_DATA_FIELD_UPDATE_INTERVAL = 2000; // ms
WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowLegHTMLElement.NAME = "wt-navmapdisplaypane-flightplantextinset-row-leg";
WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowLegHTMLElement.TEMPLATE = document.createElement("template");
WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowLegHTMLElement.TEMPLATE.innerHTML = `
    <style>
        :host {
            display: block;
            position: relative;
            width: 100%;
            height: 100%;
        }

        #wrapper {
            position: relative;
            width: 100%;
            height: 100%;
            display: grid;
            grid-template-rows: 100%;
            grid-template-columns: var(--flightplantextinset-table-grid-columns);
            grid-gap: 0 var(--flightplantextinset-table-grid-column-gap, 0.2em);
            justify-items: stretch;
            align-items: center;
        }
            #waypoint {
                text-align: left;
                color: var(--wt-g3x5-lightblue);
                white-space: nowrap;
                overflow: hidden;
            }
            #wrapper[active="true"] #waypoint {
                color: var(--wt-g3x5-purple);
            }
            .dataFieldContainer {
                position: relative;
            }
            .fullSizeOnly {
                display: none;
            }
            #wrapper[size="full"] .fullSizeOnly {
                display: block;
            }
                wt-navdatainfo-view {
                    position: absolute;
                    left: 0%;
                    top: 50%;
                    width: 100%;
                    height: auto;
                    --navdatainfo-justify-content: flex-end;
                    transform: translateY(-50%) rotateX(0deg);
                }
                #wrapper[active="true"] wt-navdatainfo-view {
                    --navdatainfo-value-color: var(--wt-g3x5-purple);
                }
    </style>
    <div id="wrapper">
        <div id="waypoint"></div>
        <div class="dataFieldContainer">
            <wt-navdatainfo-view id="dtk" class="dataField"></wt-navdatainfo-view>
        </div>
        <div class="dataFieldContainer">
            <wt-navdatainfo-view id="dis" class="dataField"></wt-navdatainfo-view>
        </div>
        <wt-navmapdisplaypane-flightplantextinset-row-altitudeconstraint id="altconstraint" slot="content"></wt-navmapdisplaypane-flightplantextinset-row-altitudeconstraint>
        <div class="dataFieldContainer fullSizeOnly">
            <wt-navdatainfo-view id="fuel" class="dataField"></wt-navdatainfo-view>
        </div>
        <div class="dataFieldContainer fullSizeOnly">
            <wt-navdatainfo-view id="ete" class="dataField"></wt-navdatainfo-view>
        </div>
        <div class="dataFieldContainer fullSizeOnly">
            <wt-navdatainfo-view id="eta" class="dataField"></wt-navdatainfo-view>
        </div>
    </div>
`;

customElements.define(WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowLegHTMLElement.NAME, WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowLegHTMLElement);

class WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowAirwaySequenceFooterHTMLElement extends WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowLegHTMLElement {
    /**
     *
     * @param {WT_NumberUnit} value
     */
    _updateLegDistance(value) {
        value.set(this.leg ? this.leg.parent.distance : NaN);
    }

    /**
     *
     * @param {WT_NumberUnit} value
     */
    _updateDTK(value) {
        value.set(NaN);
    }

    /**
     *
     * @param {WT_NumberUnit} value
     */
    _updateETE(value) {
        if (this.leg) {
            let distanceNM = this.leg.parent.distance.asUnit(WT_Unit.NMILE);
            let speedKnots = this._instrument.airplane.navigation.groundSpeed(this._tempKnots).number;
            value.set(distanceNM / speedKnots, WT_Unit.HOUR);
        } else {
            value.set(NaN);
        }
    }
}
WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowAirwaySequenceFooterHTMLElement.NAME = "wt-navmapdisplaypane-flightplantextinset-row-airwayfooter";

customElements.define(WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowAirwaySequenceFooterHTMLElement.NAME, WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowAirwaySequenceFooterHTMLElement);

class WT_G3x5_NavMapDisplayPaneFlightPlanInsetLegAltitudeConstraintHTMLElement extends HTMLElement {
    constructor() {
        super();

        this.attachShadow({mode: "open"});
        this.shadowRoot.appendChild(this._getTemplate().content.cloneNode(true));

        this._constraint = null;
        this._altitudeUnit = null;
        this._isInit = false;

        this._initFormatter();
    }

    _getTemplate() {
        return WT_G3x5_NavMapDisplayPaneFlightPlanInsetLegAltitudeConstraintHTMLElement.TEMPLATE;
    }

    _initFormatter() {
        let formatterOpts = {
            precision: 1,
            unitCaps: true
        };
        let htmlFormatterOpts = {
            numberUnitDelim: "",
            classGetter: {
                _numberClassList: [],
                _unitClassList: [WT_G3x5_NavMapDisplayPaneFlightPlanInsetLegAltitudeConstraintHTMLElement.UNIT_CLASS],
                getNumberClassList() {
                    return this._numberClassList;
                },
                getUnitClassList() {
                    return this._unitClassList;
                }
            }
        };
        this._altitudeFormatter = new WT_NumberHTMLFormatter(new WT_NumberFormatter(formatterOpts), htmlFormatterOpts);
    }

    _defineChildren() {
        this._wrapper = this.shadowRoot.querySelector(`#wrapper`);

        this._ceilText = this.shadowRoot.querySelector(`#ceiltext`);
        this._floorText = this.shadowRoot.querySelector(`#floortext`);
    }

    connectedCallback() {
        this._defineChildren();
        this._isInit = true;
        this._doUpdate();
    }

    _displayNone() {
        this._ceilText.innerHTML = `_____${this._altitudeFormatter.getFormattedUnitHTML(WT_Unit.FOOT.createNumber(0), this._altitudeUnit)}`;
        this._wrapper.setAttribute("mode", "none");
    }

    _displayAdvisoryAltitude(altitude) {
        this._ceilText.innerHTML = this._altitudeFormatter.getFormattedHTML(altitude, this._altitudeUnit);
        this._wrapper.setAttribute("mode", "advisory");
    }

    /**
     *
     * @param {WT_AltitudeConstraint} constraint
     */
    _displayPublishedConstraint(constraint) {
        switch (constraint.type) {
            case WT_AltitudeConstraint.Type.AT_OR_ABOVE:
                this._floorText.innerHTML = this._altitudeFormatter.getFormattedHTML(constraint.floor, this._altitudeUnit);
                this._wrapper.setAttribute("mode", "above");
                break;
            case WT_AltitudeConstraint.Type.AT_OR_BELOW:
                this._ceilText.innerHTML = this._altitudeFormatter.getFormattedHTML(constraint.ceiling, this._altitudeUnit);
                this._wrapper.setAttribute("mode", "below");
                break;
            case WT_AltitudeConstraint.Type.AT:
                this._ceilText.innerHTML = this._altitudeFormatter.getFormattedHTML(constraint.ceiling, this._altitudeUnit);
                this._wrapper.setAttribute("mode", "at");
                break;
            case WT_AltitudeConstraint.Type.BETWEEN:
                this._ceilText.innerHTML = this._altitudeFormatter.getFormattedHTML(constraint.ceiling, this._altitudeUnit);
                this._floorText.innerHTML = this._altitudeFormatter.getFormattedHTML(constraint.floor, this._altitudeUnit);
                this._wrapper.setAttribute("mode", "between");
                break;
        }
    }

    _doUpdate() {
        if (this._constraint) {
            if (this._constraint.advisoryAltitude) {
                this._displayAdvisoryAltitude(this._constraint.advisoryAltitude);
            } else if (this._constraint.publishedConstraint) {
                this._displayPublishedConstraint(this._constraint.publishedConstraint);
            } else {
                this._displayNone();
            }
        } else {
            this._displayNone();
        }
    }

    /**
     *
     * @param {WT_FlightPlanLegAltitudeConstraint} constraint
     */
    update(constraint, altitudeUnit) {
        this._constraint = constraint;
        this._altitudeUnit = altitudeUnit;
        if (this._isInit) {
            this._doUpdate();
        }
    }
}
WT_G3x5_NavMapDisplayPaneFlightPlanInsetLegAltitudeConstraintHTMLElement.UNIT_CLASS = "unit";
WT_G3x5_NavMapDisplayPaneFlightPlanInsetLegAltitudeConstraintHTMLElement.NAME = "wt-navmapdisplaypane-flightplantextinset-row-altitudeconstraint";
WT_G3x5_NavMapDisplayPaneFlightPlanInsetLegAltitudeConstraintHTMLElement.TEMPLATE = document.createElement("template");
WT_G3x5_NavMapDisplayPaneFlightPlanInsetLegAltitudeConstraintHTMLElement.TEMPLATE.innerHTML = `
    <style>
        :host {
            display: block;
            position: relative;
            width: 100%;
            height: 100%;
        }

        #wrapper {
            position: absolute;
            left: var(--flightplanaltitudeconstraint-padding-left, 0.2em);
            top: var(--flightplanaltitudeconstraint-padding-top, 0.2em);
            width: calc(100% - var(--flightplanaltitudeconstraint-padding-left, 0.2em) - var(--flightplanaltitudeconstraint-padding-right, 0.2em));
            height: calc(100% - var(--flightplanaltitudeconstraint-padding-top, 0.2em) - var(--flightplanaltitudeconstraint-padding-bottom, 0.2em));
            color: white;
        }
            #altitude {
                position: absolute;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                display: flex;
                flex-flow: column nowrap;
                align-items: center;
            }
                .altitudeComponent {
                    display: none;
                }
                #wrapper[mode="none"] .none,
                #wrapper[mode="advisory"] .advisory,
                #wrapper[mode="above"] .above,
                #wrapper[mode="below"] .below,
                #wrapper[mode="at"] .at,
                #wrapper[mode="between"] .between {
                    display: block;
                }
                #ceilbar {
                    width: 100%;
                    height: 0;
                    border-bottom: solid var(--flightplanaltitudeconstraint-bar-stroke-width, 2px) white;
                }
                #floorbar {
                    width: 100%;
                    height: 0;
                    border-top: solid var(--flightplanaltitudeconstraint-bar-stroke-width, 2px) white;
                }

        .${WT_G3x5_NavMapDisplayPaneFlightPlanInsetLegAltitudeConstraintHTMLElement.UNIT_CLASS} {
            font-size: var(--flightplanaltitudeconstraint-unit-font-size, 0.75em)
        }
    </style>
    <div id="wrapper">
        <div id="altitude">
            <div id="ceilbar" class="altitudeComponent between at below"></div>
            <div id="ceiltext" class="altitudeComponent between at below advisory none"></div>
            <div id="floortext" class="altitudeComponent between above"></div>
            <div id="floorbar" class="altitudeComponent between at above"></div>
        </div>
    </div>
`;

customElements.define(WT_G3x5_NavMapDisplayPaneFlightPlanInsetLegAltitudeConstraintHTMLElement.NAME, WT_G3x5_NavMapDisplayPaneFlightPlanInsetLegAltitudeConstraintHTMLElement);

class WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHeaderHTMLElement extends HTMLElement {
    constructor() {
        super();

        this.attachShadow({mode: "open"});
        this.shadowRoot.appendChild(this._getTemplate().content.cloneNode(true));

        this._size = WT_G3x5_DisplayPane.Size.OFF;
        this._isDistanceCumulative = false;
        this._sequence = null;
        this._indent = 0;
        this._headerText = "";
        this._isInit = false;
    }

    _getTemplate() {
        return WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHeaderHTMLElement.TEMPLATE;
    }

    /**
     * @readonly
     * @type {Boolean}
     */
    get isInitialized() {
        return this._isInit;
    }

    /**
     * @readonly
     * @type {WT_FlightPlanSequence}
     */
    get sequence() {
        return this._sequence;
    }

    async _defineChildren() {
        this._wrapper = this.shadowRoot.querySelector(`#wrapper`);
        this._header = this.shadowRoot.querySelector(`#header`);
    }

    async _connectedCallbackHelper() {
        await this._defineChildren();
        this._isInit = true;
        this._updateFromIndent();
        this._updateFromHeaderText();
    }

    connectedCallback() {
        this._connectedCallbackHelper();
    }

    /**
     *
     * @param {WT_G3x5_DisplayPane.Size} size
     */
    setSize(size) {
        if (this._size === size) {
            return;
        }

        this._size = size;
    }

    /**
     *
     * @param {WT_G3x5_DisplayPane.Size} isCumulative
     */
    setDistanceCumulative(isCumulative) {
        if (this._isDistanceCumulative === isCumulative) {
            return;
        }

        this._isDistanceCumulative = isCumulative;
    }

    /**
     *
     * @param {WT_FlightPlanSequence} sequence
     */
    setSequence(sequence) {
        this._sequence = sequence;
    }

    _updateFromIndent() {
        this._header.style.paddingLeft = `${this._indent * 0.5}em`;
    }

    /**
     *
     * @param {Number} indent
     */
    setIndent(indent) {
        this._indent = indent;
        if (this._isInit) {
            this._updateFromIndent();
        }
    }

    _updateFromHeaderText() {
        this._header.innerHTML = this._headerText;
    }

    setHeaderText(text) {
        if (this._headerText === text) {
            return;
        }

        this._headerText = text;
        if (this._isInit) {
            this._updateFromHeaderText();
        }
    }

    /**
     *
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanInsetState} state
     */
    update(state) {
    }
}
WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHeaderHTMLElement.NAME = "wt-navmapdisplaypane-flightplan-row-header";
WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHeaderHTMLElement.TEMPLATE = document.createElement("template");
WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHeaderHTMLElement.TEMPLATE.innerHTML = `
    <style>
        :host {
            display: block;
            position: relative;
            width: 100%;
            height: 100%;
        }

        #wrapper {
            position: relative;
            width: 100%;
            height: 100%;
            display: grid;
            grid-template-rows: 100%;
            grid-template-columns: 100%;
            align-items: center;
        }
            #header {
                text-align: left;
                color: var(--wt-g3x5-lightblue);
                white-space: nowrap;
                overflow: hidden;
            }
    </style>
    <div id="wrapper">
        <div id="header"></div>
    </div>
`;

customElements.define(WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHeaderHTMLElement.NAME, WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHeaderHTMLElement);

class WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRenderer {
    /**
     * @param {WT_FlightPlan} flightPlan
     */
    constructor(flightPlan) {
        this._flightPlan = flightPlan;

        this._origin = new WT_G3x5_NavMapDisplayPaneFlightPlanOriginRenderer(this, flightPlan.getOrigin());
        this._enroute = new WT_G3x5_NavMapDisplayPaneFlightPlanEnrouteRenderer(this, flightPlan.getEnroute());
        this._destination = new WT_G3x5_NavMapDisplayPaneFlightPlanDestinationRenderer(this, flightPlan.getDestination());

        this._departure = null;
        this._arrival = null;
        this._approach = null;

        /**
         * @type {WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement[]}
         */
        this._renderedRows = [];
        /**
         * @type {Map<WT_FlightPlanLeg,WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement>}
         */
        this._legRows = new Map();
        /**
         * @type {WT_FlightPlanLeg}
         */
        this._activeLeg = null;
    }

    /**
     * @readonly
     * @type {WT_FlightPlan}
     */
    get flightPlan() {
        return this._flightPlan;
    }

    /**
     * @readonly
     * @type {WT_FlightPlanLeg}
     */
    get activeLeg() {
        return this._activeLeg;
    }

    /**
     *
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanHTMLElement} htmlElement
     */
    clearRenderedRows(htmlElement) {
        this._renderedRows = [];
        this._legRows.clear();
        htmlElement.clearRows();
    }

    /**
     *
     * @param {WT_FlightPlanLeg} leg
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement} row
     */
    _registerLegRow(leg, row) {
        this._legRows.set(leg, row);
    }

    _createRowRenderers() {
        let rowRenderers = [];
        if (this.flightPlan.hasDeparture()) {
            this._departure = new WT_G3x5_NavMapDisplayPaneFlightPlanDepartureRenderer(this, this.flightPlan.getDeparture());
            rowRenderers.push(...this._departure.createRowRenderers());
        } else {
            rowRenderers.push(...this._origin.createRowRenderers());
            this._departure = null;
        }
        rowRenderers.push(...this._enroute.createRowRenderers());
        if (this.flightPlan.hasArrival()) {
            this._arrival = new WT_G3x5_NavMapDisplayPaneFlightPlanArrivalRenderer(this, this.flightPlan.getArrival());
            rowRenderers.push(...this._arrival.createRowRenderers());
        } else {
            rowRenderers.push(...this._destination.createRowRenderers());
            this._arrival = null;
        }
        if (this.flightPlan.hasApproach()) {
            this._approach = new WT_G3x5_NavMapDisplayPaneFlightPlanApproachRenderer(this, this.flightPlan.getApproach());
            rowRenderers.push(...this._approach.createRowRenderers());
        } else {
            this._approach = null;
        }
        return rowRenderers;
    }

    /**
     *
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowRenderer[]} rowRenderers
     * @param {WT_FlightPlanLeg} activeLeg
     */
    _findRowStartIndex(rowRenderers, activeLeg) {
        if (!activeLeg || rowRenderers.length <= 5) {
            return 0;
        }

        let activeLegRowIndex = rowRenderers.findIndex(rowRenderer => rowRenderer instanceof WT_G3x5_NavMapDisplayPaneFlightPlanLegRowRenderer && rowRenderer.leg === activeLeg);
        if (activeLegRowIndex <= 0) {
            return 0;
        }

        let previousLeg = activeLeg.previousLeg();
        let previousLegRowIndex = previousLeg ? Math.min(activeLegRowIndex, rowRenderers.findIndex(rowRenderer => rowRenderer instanceof WT_G3x5_NavMapDisplayPaneFlightPlanLegRowRenderer && rowRenderer.leg === previousLeg)) : activeLegRowIndex;

        if (previousLegRowIndex > 0) {
            // check if the row before the first leg row is a header row; if so, we will show the header row as the first row instead
            if (rowRenderers[previousLegRowIndex - 1] instanceof WT_G3x5_NavMapDisplayPaneFlightPlanSequenceHeaderRowRenderer) {
                previousLegRowIndex--;
            }
        }

        return Math.min(previousLegRowIndex, rowRenderers.length - 5);
    }

    _updateActiveLegArrow(htmlElement, activeLeg) {
        let showArrow = false;
        if (activeLeg) {
            let previousLeg = activeLeg.previousLeg();
            if (previousLeg) {
                let activeLegRow = this._legRows.get(activeLeg);
                let previousLegRow = this._legRows.get(previousLeg);
                if (activeLegRow && previousLegRow) {
                    let previousLegCenterY = previousLegRow.offsetTop + previousLegRow.offsetHeight / 2;
                    let activeLegCenterY = activeLegRow.offsetTop + activeLegRow.offsetHeight / 2;
                    htmlElement.moveActiveArrow(previousLegCenterY, activeLegCenterY);
                    showArrow = true;
                }
            }
        }
        htmlElement.setActiveArrowVisible(showArrow);
    }

    /**
     *
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanHTMLElement} htmlElement
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowRenderer[]} rowRenderers
     * @param {Number} startIndex
     */
    _drawRows(htmlElement, rowRenderers, startIndex) {
        let endIndex = Math.min(startIndex + 5, rowRenderers.length);
        for (let i = startIndex; i < endIndex; i++) {
            let renderer = rowRenderers[i];
            let row = renderer.draw(htmlElement, this.activeLeg);
            this._renderedRows.push(row);
            if (renderer instanceof WT_G3x5_NavMapDisplayPaneFlightPlanLegRowRenderer) {
                this._registerLegRow(renderer.leg, row);
            }
        }
    }

    /**
     *
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanHTMLElement} htmlElement
     * @param {WT_FlightPlanLeg} [activeLeg]
     */
    draw(htmlElement, activeLeg) {
        this.clearRenderedRows(htmlElement);
        this._activeLeg = activeLeg ? activeLeg : null;

        let rowRenderers = this._createRowRenderers();
        let rowStartIndex = this._findRowStartIndex(rowRenderers, activeLeg);
        this._drawRows(htmlElement, rowRenderers, rowStartIndex);

        this._updateActiveLegArrow(htmlElement, this.activeLeg);
    }

    /**
     *
     * @param {WT_FlightPlanLeg} leg
     */
    updateAltitudeConstraint(leg) {
        let row = this._legRows.get(leg);
        if (row) {
            row.getActiveModeHTMLElement().updateAltitudeConstraint();
        }
    }

    /**
     *
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetHTMLElement} htmlElement
     * @param {WT_FlightPlanLeg} activeLeg
     * @param {Boolean}
     */
    _updateActiveLeg(htmlElement, activeLeg) {
        if (this._activeLeg === activeLeg) {
            return false;
        }

        this._activeLeg = activeLeg;
        this.draw(htmlElement, activeLeg);
        return true;
    }

    /**
     *
     * @param {WT_G3x5_TSCFlightPlanState} state
     */
    _updateRows(state) {
        this._renderedRows.forEach(row => row.update(state));
    }

    /**
     *
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetHTMLElement} htmlElement
     * @param {WT_G3x5_TSCFlightPlanState} state
     */
    update(htmlElement, state) {
        let updated = this._updateActiveLeg(htmlElement, state.activeLeg);
        if (!updated) {
            this._updateRows(state);
        }
    }
}

class WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowRenderer {
    /**
     *
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement} row
     * @param {WT_FlightPlanLeg} activeLeg
     */
    _doRender(row, activeLeg) {
    }

    /**
     *
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement} htmlElement
     * @param {WT_FlightPlanLeg} activeLeg
     * @returns {WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement}
     */
    draw(htmlElement, activeLeg) {
        let row = htmlElement.requestRow();
        this._doRender(row, activeLeg);
        return row;
    }
}

/**
 * @abstract
 * @template {WT_FlightPlanElement} T
 */
class WT_G3x5_NavMapDisplayPaneFlightPlanElementRenderer {
    /**
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRenderer} parent
     * @param {T} element
     */
    constructor(parent, element) {
        this._parent = parent;
        this._element = element;
    }

    /**
     * @readonly
     * @type {T}
     */
    get element() {
        return this._element;
    }

    /**
     *
     * @returns {WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowRenderer[]}
     */
    createRowRenderers() {
    }
}

/**
 * @template {WT_FlightPlanSequence} T
 */
class WT_G3x5_NavMapDisplayPaneFlightPlanSequenceHeaderRowRenderer extends WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowRenderer {
    /**
     * @param {T} sequence
     */
    constructor(sequence) {
        super();

        this._sequence = sequence;
    }

    /**
     * @readonly
     * @type {T}
     */
    get sequence() {
        return this._sequence;
    }

    /**
     *
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement} row
     * @param {WT_FlightPlanLeg} activeLeg
     */
    _doRender(row, activeLeg) {
        row.setMode(WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement.Mode.HEADER);
        let modeHTMLElement = row.getActiveModeHTMLElement();
        modeHTMLElement.setSequence(this._sequence);
    }
}

/**
 * @abstract
 * @template {WT_FlightPlanSequence} T
 * @extends WT_G3x5_NavMapDisplayPaneFlightPlanElementRenderer<T>
 */
class WT_G3x5_NavMapDisplayPaneFlightPlanSequenceRenderer extends WT_G3x5_NavMapDisplayPaneFlightPlanElementRenderer {
    /**
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRenderer} parent
     * @param {T} sequence
     */
    constructor(parent, sequence) {
        super(parent, sequence);

        /**
         * @type {WT_G3x5_TSCFlightPlanElementRenderer[]}
         */
        this._children = [];
    }

    _mapElementToRenderer(element) {
        if (element instanceof WT_FlightPlanAirwaySequence) {
            return new WT_G3x5_NavMapDisplayPaneFlightPlanAirwayRenderer(this._parent, element);
        } else if (element instanceof WT_FlightPlanLeg) {
            return new WT_G3x5_NavMapDisplayPaneFlightPlanLegRenderer(this._parent, element);
        }
        return null;
    }

    /**
     *
     * @returns {WT_G3x5_NavMapDisplayPaneFlightPlanSequenceHeaderRowRenderer<T>}
     */
    _createHeaderRowRenderer() {
    }

    /**
     *
     * @returns {WT_G3x5_NavMapDisplayPaneFlightPlanElementRenderer[]}
     */
    _createChildRenderers() {
        return this.element.elements.map(this._mapElementToRenderer.bind(this));
    }

    createRowRenderers() {
        let childRenderers = this._createChildRenderers();
        let rowRenderers = [this._createHeaderRowRenderer()];
        childRenderers.forEach(renderer => rowRenderers.push(...renderer.createRowRenderers()));
        return rowRenderers;
    }
}

/**
 * @extends WT_G3x5_NavMapDisplayPaneFlightPlanSequenceHeaderRowRenderer<WT_FlightPlanAirwaySequence>
 */
 class WT_G3x5_NavMapDisplayPaneFlightPlanAirwaySequenceHeaderRowRenderer extends WT_G3x5_NavMapDisplayPaneFlightPlanSequenceHeaderRowRenderer {
    /**
     *
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement} row
     * @param {WT_FlightPlanLeg} activeLeg
     */
    _doRender(row, activeLeg) {
        super._doRender(row, activeLeg);

        let modeHTMLElement = row.getActiveModeHTMLElement();
        modeHTMLElement.setIndent(2);
        modeHTMLElement.setHeaderText(`Airway – ${this.sequence.airway.name}.${this.sequence.legs.last().fix.ident}`);
    }
}

/**
 * @extends WT_G3x5_NavMapDisplayPaneFlightPlanSequenceRenderer<WT_FlightPlanAirwaySequence>
 */
class WT_G3x5_NavMapDisplayPaneFlightPlanAirwayRenderer extends WT_G3x5_NavMapDisplayPaneFlightPlanSequenceRenderer {
    /**
     *
     * @returns {WT_G3x5_NavMapDisplayPaneFlightPlanAirwaySequenceHeaderRowRenderer}
     */
    _createHeaderRowRenderer() {
        return new WT_G3x5_NavMapDisplayPaneFlightPlanAirwaySequenceHeaderRowRenderer(this.element);
    }

    _createChildRenderers() {
        let shouldCollapse = !(this._parent.activeLeg && this.element === this._parent.activeLeg.parent);
        if (shouldCollapse) {
            return [new WT_G3x5_NavMapDisplayPaneFlightPlanAirwaySequenceFooterRenderer(this._parent, this.element.legs.last())];
        } else {
            return super._createChildRenderers();
        }
    }
}

/**
 * @template {WT_FlightPlanSegment} T
 * @extends WT_G3x5_NavMapDisplayPaneFlightPlanSequenceHeaderRowRenderer<T>
 */
class WT_G3x5_NavMapDisplayPaneFlightPlanSegmentHeaderRowRenderer extends WT_G3x5_NavMapDisplayPaneFlightPlanSequenceHeaderRowRenderer {
    /**
     *
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement} row
     * @param {WT_FlightPlanLeg} activeLeg
     */
    _doRender(row, activeLeg) {
        super._doRender(row, activeLeg);

        let modeHTMLElement = row.getActiveModeHTMLElement();
        modeHTMLElement.setIndent(1);
    }
}

/**
 * @template {WT_FlightPlanSegment} T
 * @extends WT_G3x5_NavMapDisplayPaneFlightPlanSequenceRenderer<T>
 */
class WT_G3x5_NavMapDisplayPaneFlightPlanSegmentRenderer extends WT_G3x5_NavMapDisplayPaneFlightPlanSequenceRenderer {
    createRowRenderers() {
        return this.element.legs.length > 0 ? super.createRowRenderers() : [];
    }
}

/**
 * @extends WT_G3x5_NavMapDisplayPaneFlightPlanSegmentHeaderRowRenderer<WT_FlightPlanOrigin>
 */
class WT_G3x5_NavMapDisplayPaneFlightPlanOriginHeaderRowRenderer extends WT_G3x5_NavMapDisplayPaneFlightPlanSegmentHeaderRowRenderer {
    /**
     *
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement} row
     * @param {WT_FlightPlanLeg} activeLeg
     */
    _doRender(row, activeLeg) {
        super._doRender(row, activeLeg);

        let modeHTMLElement = row.getActiveModeHTMLElement();
        if (this.sequence.waypoint) {
            modeHTMLElement.setHeaderText(`Origin – ${this.sequence.waypoint.ident}`);
        } else {
            modeHTMLElement.setHeaderText("Origin");
        }
    }
}

/**
 * @extends WT_G3x5_NavMapDisplayPaneFlightPlanSegmentRenderer<WT_FlightPlanOrigin>
 */
class WT_G3x5_NavMapDisplayPaneFlightPlanOriginRenderer extends WT_G3x5_NavMapDisplayPaneFlightPlanSegmentRenderer {
    /**
     *
     * @returns {WT_G3x5_NavMapDisplayPaneFlightPlanOriginHeaderRowRenderer}
     */
    _createHeaderRowRenderer() {
        return new WT_G3x5_NavMapDisplayPaneFlightPlanOriginHeaderRowRenderer(this.element);
    }
}

/**
 * @extends WT_G3x5_NavMapDisplayPaneFlightPlanSegmentHeaderRowRenderer<WT_FlightPlanDestination>
 */
class WT_G3x5_NavMapDisplayPaneFlightPlanDestinationHeaderRowRenderer extends WT_G3x5_NavMapDisplayPaneFlightPlanSegmentHeaderRowRenderer {
    /**
     *
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement} row
     * @param {WT_FlightPlanLeg} activeLeg
     */
    _doRender(row, activeLeg) {
        super._doRender(row, activeLeg);

        let modeHTMLElement = row.getActiveModeHTMLElement();
        if (this.sequence.waypoint) {
            modeHTMLElement.setHeaderText(`Destination – ${this.sequence.waypoint.ident}`);
        } else {
            modeHTMLElement.setHeaderText("Destination");
        }
    }
}

/**
 * @extends WT_G3x5_NavMapDisplayPaneFlightPlanSegmentRenderer<WT_FlightPlanDestination>
 */
class WT_G3x5_NavMapDisplayPaneFlightPlanDestinationRenderer extends WT_G3x5_NavMapDisplayPaneFlightPlanSegmentRenderer {
    /**
     *
     * @returns {WT_G3x5_NavMapDisplayPaneFlightPlanDestinationHeaderRowRenderer}
     */
    _createHeaderRowRenderer() {
        return new WT_G3x5_NavMapDisplayPaneFlightPlanDestinationHeaderRowRenderer(this.element);
    }
}

/**
 * @extends WT_G3x5_NavMapDisplayPaneFlightPlanSegmentHeaderRowRenderer<WT_FlightPlanDeparture>
 */
class WT_G3x5_NavMapDisplayPaneFlightPlanDepartureHeaderRowRenderer extends WT_G3x5_NavMapDisplayPaneFlightPlanSegmentHeaderRowRenderer {
    /**
     *
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement} row
     * @param {WT_FlightPlanLeg} activeLeg
     */
    _doRender(row, activeLeg) {
        super._doRender(row, activeLeg);

        let modeHTMLElement = row.getActiveModeHTMLElement();
        let departure = this.sequence.procedure;
        let rwyTransition = departure.runwayTransitions.getByIndex(this.sequence.runwayTransitionIndex);
        let enrouteTransition = departure.enrouteTransitions.getByIndex(this.sequence.enrouteTransitionIndex);
        let prefix = `${rwyTransition ? `RW${rwyTransition.runway.designationFull}` : "ALL"}.`;
        let suffix = (enrouteTransition && this.sequence.legs.length > 0) ? `.${this.sequence.legs.last().fix.ident}` : "";
        modeHTMLElement.setHeaderText(`Departure – ${departure.airport.ident}–${prefix}${departure.name}${suffix}`);
    }
}

/**
 * @extends WT_G3x5_NavMapDisplayPaneFlightPlanSegmentRenderer<WT_FlightPlanDeparture>
 */
class WT_G3x5_NavMapDisplayPaneFlightPlanDepartureRenderer extends WT_G3x5_NavMapDisplayPaneFlightPlanSegmentRenderer {
    /**
     *
     * @returns {WT_G3x5_NavMapDisplayPaneFlightPlanDepartureHeaderRowRenderer}
     */
    _createHeaderRowRenderer() {
        return new WT_G3x5_NavMapDisplayPaneFlightPlanDepartureHeaderRowRenderer(this.element);
    }

    _createChildRenderers() {
        let renderers = super._createChildRenderers();

        if (!this.element.procedure.runwayTransitions.getByIndex(this.element.runwayTransitionIndex)) {
            // if the departure does not have a runway selected, add the origin as the first "leg"
            renderers.unshift(new WT_G3x5_NavMapDisplayPaneFlightPlanLegRenderer(this._parent, this.element.flightPlan.getOrigin().leg()));
        }

        return renderers;
    }
}

/**
 * @extends WT_G3x5_NavMapDisplayPaneFlightPlanSegmentHeaderRowRenderer<WT_FlightPlanEnroute>
 */
class WT_G3x5_NavMapDisplayPaneFlightPlanEnrouteHeaderRowRenderer extends WT_G3x5_NavMapDisplayPaneFlightPlanSegmentHeaderRowRenderer {
    /**
     *
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement} row
     * @param {WT_FlightPlanLeg} activeLeg
     */
    _doRender(row, activeLeg) {
        super._doRender(row, activeLeg);

        let modeHTMLElement = row.getActiveModeHTMLElement();
        modeHTMLElement.setHeaderText("Enroute");
    }
}

/**
 * @extends WT_G3x5_NavMapDisplayPaneFlightPlanSegmentRenderer<WT_FlightPlanEnroute>
 */
class WT_G3x5_NavMapDisplayPaneFlightPlanEnrouteRenderer extends WT_G3x5_NavMapDisplayPaneFlightPlanSegmentRenderer {
    /**
     *
     * @returns {WT_G3x5_NavMapDisplayPaneFlightPlanEnrouteHeaderRowRenderer}
     */
    _createHeaderRowRenderer() {
        return new WT_G3x5_NavMapDisplayPaneFlightPlanEnrouteHeaderRowRenderer(this.element);
    }
}

/**
 * @extends WT_G3x5_NavMapDisplayPaneFlightPlanSegmentHeaderRowRenderer<WT_FlightPlanArrival>
 */
class WT_G3x5_NavMapDisplayPaneFlightPlanArrivalHeaderRowRenderer extends WT_G3x5_NavMapDisplayPaneFlightPlanSegmentHeaderRowRenderer {
    /**
     *
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement} row
     * @param {WT_FlightPlanLeg} activeLeg
     */
    _doRender(row, activeLeg) {
        super._doRender(row, activeLeg);

        let modeHTMLElement = row.getActiveModeHTMLElement();
        let arrival = this.sequence.procedure;
        let enrouteTransition = arrival.enrouteTransitions.getByIndex(this.sequence.enrouteTransitionIndex);
        let rwyTransition = arrival.runwayTransitions.getByIndex(this.sequence.runwayTransitionIndex);
        let prefix = (enrouteTransition && this.sequence.legs.length > 0) ? `${this.sequence.legs.first().fix.ident}.` : "";
        let suffix = `.${rwyTransition ? `RW${rwyTransition.runway.designationFull}` : "ALL"}`;
        modeHTMLElement.setHeaderText(`Arrival – ${arrival.airport.ident}–${prefix}${arrival.name}${suffix}`);
    }
}

/**
 * @extends WT_G3x5_NavMapDisplayPaneFlightPlanSegmentRenderer<WT_FlightPlanArrival>
 */
class WT_G3x5_NavMapDisplayPaneFlightPlanArrivalRenderer extends WT_G3x5_NavMapDisplayPaneFlightPlanSegmentRenderer {
    /**
     *
     * @returns {WT_G3x5_NavMapDisplayPaneFlightPlanArrivalHeaderRowRenderer}
     */
    _createHeaderRowRenderer() {
        return new WT_G3x5_NavMapDisplayPaneFlightPlanArrivalHeaderRowRenderer(this.element);
    }

    _createChildRenderers() {
        let renderers = super._createChildRenderers();
        // we need to manually add the destination "leg" to the end of the arrival since the sim doesn't give it to us automatically
        renderers.push(new WT_G3x5_NavMapDisplayPaneFlightPlanLegRenderer(this._parent, this.element.flightPlan.getDestination().leg()));
        return renderers;
    }
}

/**
 * @extends WT_G3x5_NavMapDisplayPaneFlightPlanSegmentHeaderRowRenderer<WT_FlightPlanApproach>
 */
class WT_G3x5_NavMapDisplayPaneFlightPlanApproachHeaderRowRenderer extends WT_G3x5_NavMapDisplayPaneFlightPlanSegmentHeaderRowRenderer {
    /**
     *
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement} row
     * @param {WT_FlightPlanLeg} activeLeg
     */
    _doRender(row, activeLeg) {
        super._doRender(row, activeLeg);

        let modeHTMLElement = row.getActiveModeHTMLElement();
        let approach = this.sequence.procedure;
        modeHTMLElement.setHeaderText(`Approach – ${approach.airport.ident}–${approach.name}`);
    }
}

/**
 * @extends WT_G3x5_NavMapDisplayPaneFlightPlanSegmentRenderer<WT_FlightPlanApproach>
 */
class WT_G3x5_NavMapDisplayPaneFlightPlanApproachRenderer extends WT_G3x5_NavMapDisplayPaneFlightPlanSegmentRenderer {
    /**
     *
     * @returns {WT_G3x5_NavMapDisplayPaneFlightPlanApproachHeaderRowRenderer}
     */
    _createHeaderRowRenderer() {
        return new WT_G3x5_NavMapDisplayPaneFlightPlanApproachHeaderRowRenderer(this.element);
    }
}

class WT_G3x5_NavMapDisplayPaneFlightPlanLegRowRenderer extends WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowRenderer {
    /**
     * @param {WT_FlightPlanLeg} leg
     */
    constructor(leg) {
        super();

        this._leg = leg;
    }

    /**
     * @readonly
     * @type {WT_FlightPlanLeg}
     */
    get leg() {
        return this._leg;
    }

    /**
     *
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement} row
     * @param {WT_FlightPlanLeg} activeLeg
     */
    _doRender(row, activeLeg) {
        row.setMode(WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement.Mode.LEG);

        let modeHTMLElement = row.getActiveModeHTMLElement();
        modeHTMLElement.setLeg(this.leg);
        modeHTMLElement.setIndent(this.leg.parent instanceof WT_FlightPlanSegment ? 2 : 3);
        modeHTMLElement.setActive(this.leg === activeLeg);
    }
}

/**
 * @extends WT_G3x5_NavMapDisplayPaneFlightPlanElementRenderer<WT_FlightPlanLeg>
 */
class WT_G3x5_NavMapDisplayPaneFlightPlanLegRenderer extends WT_G3x5_NavMapDisplayPaneFlightPlanElementRenderer {
    /**
     *
     * @returns {WT_G3x5_NavMapDisplayPaneFlightPlanLegRowRenderer}
     */
    _createLegRowRenderer() {
        return new WT_G3x5_NavMapDisplayPaneFlightPlanLegRowRenderer(this.element);
    }

    /**
     *
     * @returns {WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowRenderer[]}
     */
    createRowRenderers() {
        return [this._createLegRowRenderer()];
    }
}

class WT_G3x5_NavMapDisplayPaneFlightPlanAirwayFooterRowRenderer extends WT_G3x5_NavMapDisplayPaneFlightPlanLegRowRenderer {
    /**
     *
     * @param {WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement} row
     * @param {WT_FlightPlanLeg} activeLeg
     */
    _doRender(row, activeLeg) {
        row.setMode(WT_G3x5_NavMapDisplayPaneFlightPlanTextInsetRowHTMLElement.Mode.AIRWAY_FOOTER);

        let modeHTMLElement = row.getActiveModeHTMLElement();
        modeHTMLElement.setLeg(this.leg);
        modeHTMLElement.setIndent(2);
        modeHTMLElement.setActive(this.leg === activeLeg);
    }
}

class WT_G3x5_NavMapDisplayPaneFlightPlanAirwaySequenceFooterRenderer extends WT_G3x5_NavMapDisplayPaneFlightPlanLegRenderer {
    /**
     *
     * @returns {WT_G3x5_NavMapDisplayPaneFlightPlanAirwayFooterRowRenderer}
     */
    _createLegRowRenderer() {
        return new WT_G3x5_NavMapDisplayPaneFlightPlanAirwayFooterRowRenderer(this.element);
    }
}