class Jet_PFD_AltimeterIndicator extends HTMLElement {
    constructor() {
        super(...arguments);
        this.strokeSize = "3";
        this.fontSize = 25;
        this.refHeight = 0;
        this.borderSize = 0;
        this.graduationScrollPosX = 0;
        this.graduationScrollPosY = 0;
        this.nbPrimaryGraduations = 7;
        this.nbSecondaryGraduations = 4;
        this.totalGraduations = this.nbPrimaryGraduations + ((this.nbPrimaryGraduations - 1) * this.nbSecondaryGraduations);
        this.graduationSpacing = 42;
        this.groundRibbonHasFixedHeight = false;
        this.groundLineSVGHeight = 0;
        this.mtrsVisible = WTDataStore.get('CJ4_MTRS_MODE', false);;
        this.hudAPAltitude = 0;
        this.isHud = false;
        this._aircraft = Aircraft.A320_NEO;
        this._isAltitudeAlerting = false;
        this._lastAltitudeAlertSet = false;
        this.ALTALERTANIMTIME = 4000;
        this._altAlertAnimationTimer = this.ALTALERTANIMTIME;
        this._baroPresetChanged = 0;
    }
    static get observedAttributes() {
        return ["hud"];
    }
    get aircraft() {
        return this._aircraft;
    }
    set aircraft(_val) {
        if (this._aircraft != _val) {
            this._aircraft = _val;
            this.construct();
        }
    }
    connectedCallback() {
        this.construct();
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue == newValue)
            return;
        switch (name) {
            case "hud":
                this.isHud = newValue == "true";
                break;
        }
    }
    showMTRS(_active) {
        this.mtrsVisible = _active;
    }
    isMTRSVisible() {
        return this.mtrsVisible;
    }
    construct() {
        Utils.RemoveAllChildren(this);
        this.graduations = [];
        this.borderSize = 0;
        this.groundRibbonHasFixedHeight = false;
        this.groundLineSVGHeight = 0;
        this.thousandIndicator = null;
        this.targetAltitudeIndicatorSVGText = null;
        this.cursorSVGAltitudeLevelShape = null;
        this.cursorIntegrals = null;
        this.cursorDecimals = null;
        if (this.aircraft == Aircraft.CJ4) {
            this.construct_CJ4();
        }
        else if (this.aircraft == Aircraft.B747_8) {
            this.construct_B747_8();
        }
        else if (this.aircraft == Aircraft.AS01B) {
            this.construct_AS01B();
        }
        else {
            this.construct_A320_Neo();
        }
    }
    construct_CJ4() {
        let selAlt = Simplane.getAutoPilotSelectedAltitudeLockValue()
        this.originalTargetAltitude = selAlt > -1 ? selAlt : 0;
        this.targetAltitudeChanged = false;
        this.rootSVG = document.createElementNS(Avionics.SVG.NS, "svg");
        this.rootSVG.setAttribute("id", "ViewBox");
        this.rootSVG.setAttribute("viewBox", "0 0 250 550");
        var width = 140;
        var height = 415;
        var posX = width * 0.5;
        var posY = 452.5;
        var gradWidth = 110;
        this.refHeight = height;
        this.nbPrimaryGraduations = 7;
        this.nbSecondaryGraduations = 0;
        this.graduationSpacing = 90;
        this.totalGraduations = this.nbPrimaryGraduations + ((this.nbPrimaryGraduations - 1) * this.nbSecondaryGraduations);
        this.graduationScroller = new Avionics.Scroller(this.nbPrimaryGraduations, 100, true);
        this.cursorIntegrals = new Array();
        this.cursorIntegrals.push(new CJ4_AltitudeScroller(3, 52, 1, 10, 1000));
        this.cursorIntegrals.push(new CJ4_AltitudeScroller(3, 52, 1, 10, 100));
        this.cursorIntegrals.push(new CJ4_AltitudeScroller(3, 52, 1, 10, 10));
        this.cursorDecimals = new CJ4_AltitudeScroller(5, 25, 20, 100);
        if (!this.rootGroup) {
            this.rootGroup = document.createElementNS(Avionics.SVG.NS, "g");
            this.rootGroup.setAttribute("id", "Altimeter");
        }
        else {
            Utils.RemoveAllChildren(this.rootGroup);
        }

        this.pressureBoxGroup = document.createElementNS(Avionics.SVG.NS, "g");
        this.pressureBoxGroup.setAttribute("id", "PressureBoxGroup");

        this.pressureSVGBox = document.createElementNS(Avionics.SVG.NS, "rect");
        this.pressureSVGBox.setAttribute("id", "PressureBox");
        this.pressureSVGBox.setAttribute("fill", "black");
        this.pressureSVGBox.setAttribute("stroke", "white");
        this.pressureSVGBox.setAttribute("stroke-width", "2");
        this.pressureSVGBox.setAttribute("x", (posX - 68).toString());
        this.pressureSVGBox.setAttribute("y", (posY + 2).toString());
        this.pressureSVGBox.setAttribute("width", "135");
        this.pressureSVGBox.setAttribute("height", "70");
        this.pressureBoxGroup.appendChild(this.pressureSVGBox);

        this.pressureArrow = document.createElementNS(Avionics.SVG.NS, "path");
        this.pressureArrow.setAttribute("fill", "white");
        this.pressureArrow.setAttribute("d", "M 126 505 l 0 -6 l -3 0 l 4.44 -6.96 l 4.56 6.96 l -3 0 l 0 12 l 3 0 l -4.56 6.96 l -4.44 -6.96 l 3 0 l 0 -6 z");
        this.pressureArrow.setAttribute("stroke", "white");
        this.pressureArrow.setAttribute("stroke-width", "1.5");
        this.pressureBoxGroup.appendChild(this.pressureArrow);

        this.pressurePresetLeftPart = document.createElementNS(Avionics.SVG.NS, "text");
        this.pressurePresetLeftPart.textContent = "29";
        this.pressurePresetLeftPart.setAttribute("id", "pressurePresetLeftPart");
        this.pressurePresetLeftPart.setAttribute("x", (posX - 65).toString());
        this.pressurePresetLeftPart.setAttribute("y", (posY + 65).toString());
        this.pressurePresetLeftPart.setAttribute("fill", "white");
        this.pressurePresetLeftPart.setAttribute("font-size", (this.fontSize * 1.2).toString());
        this.pressurePresetLeftPart.setAttribute("font-family", "Roboto-Light");
        this.pressurePresetLeftPart.setAttribute("text-anchor", "center");
        this.pressureBoxGroup.appendChild(this.pressurePresetLeftPart);

        this.pressurePresetCenterPart = document.createElementNS(Avionics.SVG.NS, "text");
        this.pressurePresetCenterPart.textContent = ".";
        this.pressurePresetCenterPart.setAttribute("id", "pressurePresetCenterPart");
        this.pressurePresetCenterPart.setAttribute("x", (posX - 46).toString());
        this.pressurePresetCenterPart.setAttribute("y", (posY + 65).toString());
        this.pressurePresetCenterPart.setAttribute("fill", "white");
        this.pressurePresetCenterPart.setAttribute("font-size", (this.fontSize * 2.3).toString());
        this.pressurePresetCenterPart.setAttribute("font-family", "Roboto-Light");
        this.pressurePresetCenterPart.setAttribute("text-anchor", "center");
        this.pressureBoxGroup.appendChild(this.pressurePresetCenterPart);

        this.pressurePresetRightPart = document.createElementNS(Avionics.SVG.NS, "text");
        this.pressurePresetRightPart.textContent = "92";
        this.pressurePresetRightPart.setAttribute("id", "pressurePresetRightPart");
        this.pressurePresetRightPart.setAttribute("x", (posX - 27).toString());
        this.pressurePresetRightPart.setAttribute("y", (posY + 65).toString());
        this.pressurePresetRightPart.setAttribute("fill", "white");
        this.pressurePresetRightPart.setAttribute("font-size", (this.fontSize * 1.2).toString());
        this.pressurePresetRightPart.setAttribute("font-family", "Roboto-Light");
        this.pressurePresetRightPart.setAttribute("text-anchor", "center");
        this.pressureBoxGroup.appendChild(this.pressurePresetRightPart);

        this.pressurePresetUnits = document.createElementNS(Avionics.SVG.NS, "text");
        this.pressurePresetUnits.textContent = "";
        this.pressurePresetUnits.setAttribute("id", "PressurePreset");
        this.pressurePresetUnits.setAttribute("x", (posX + 6).toString());
        this.pressurePresetUnits.setAttribute("y", (posY + 65).toString());
        this.pressurePresetUnits.setAttribute("fill", "white");
        this.pressurePresetUnits.setAttribute("stroke", "white");
        this.pressurePresetUnits.setAttribute("font-size", (this.fontSize * 1.0).toString());
        this.pressurePresetUnits.setAttribute("font-family", "Roboto-Light");
        this.pressurePresetUnits.setAttribute("text-anchor", "left");
        this.pressureBoxGroup.appendChild(this.pressurePresetUnits);

        this.rootGroup.appendChild(this.pressureBoxGroup);
        
        this.pressureSVGLeftPart = document.createElementNS(Avionics.SVG.NS, "text");
        this.pressureSVGLeftPart.textContent = "";
        this.pressureSVGLeftPart.setAttribute("id", "PressureSVGLeftPart");
        this.pressureSVGLeftPart.setAttribute("x", (posX - 59).toString());
        this.pressureSVGLeftPart.setAttribute("y", (posY + 30).toString());
        this.pressureSVGLeftPart.setAttribute("fill", "var(--cyan)");
        this.pressureSVGLeftPart.setAttribute("stroke", "black");
        this.pressureSVGLeftPart.setAttribute("stroke-width", "5px");
        this.pressureSVGLeftPart.setAttribute("font-size", (this.fontSize * 1.2).toString());
        this.pressureSVGLeftPart.setAttribute("font-family", "Roboto-Light");
        this.pressureSVGLeftPart.setAttribute("text-anchor", "center");
        this.pressureSVGLeftPart.setAttribute("letter-spacing", "0.0");
        this.rootGroup.appendChild(this.pressureSVGLeftPart);

        this.pressureSVGCenterPart = document.createElementNS(Avionics.SVG.NS, "text");
        this.pressureSVGCenterPart.textContent = "";
        this.pressureSVGCenterPart.setAttribute("id", "PressureSVGCenterPart");
        this.pressureSVGCenterPart.setAttribute("x", (posX - 39).toString());
        this.pressureSVGCenterPart.setAttribute("y", (posY + 30).toString());
        this.pressureSVGCenterPart.setAttribute("fill", "var(--cyan)");
        this.pressureSVGCenterPart.setAttribute("stroke", "black");
        this.pressureSVGCenterPart.setAttribute("stroke-width", "4px");
        this.pressureSVGCenterPart.setAttribute("font-size", (this.fontSize * 2.3).toString());
        this.pressureSVGCenterPart.setAttribute("font-family", "Roboto-Light");
        this.pressureSVGCenterPart.setAttribute("text-anchor", "center");
        this.pressureSVGCenterPart.setAttribute("letter-spacing", "0.0");
        this.rootGroup.appendChild(this.pressureSVGCenterPart);

        this.pressureSVGRightPart = document.createElementNS(Avionics.SVG.NS, "text");
        this.pressureSVGRightPart.textContent = "";
        this.pressureSVGRightPart.setAttribute("id", "PressureSVGRightPart");
        this.pressureSVGRightPart.setAttribute("x", (posX - 20).toString());
        this.pressureSVGRightPart.setAttribute("y", (posY + 30).toString());
        this.pressureSVGRightPart.setAttribute("fill", "var(--cyan)");
        this.pressureSVGRightPart.setAttribute("stroke", "black");
        this.pressureSVGRightPart.setAttribute("stroke-width", "5px");
        this.pressureSVGRightPart.setAttribute("font-size", (this.fontSize * 1.2).toString());
        this.pressureSVGRightPart.setAttribute("font-family", "Roboto-Light");
        this.pressureSVGRightPart.setAttribute("text-anchor", "center");
        this.pressureSVGRightPart.setAttribute("letter-spacing", "0.0");
        this.rootGroup.appendChild(this.pressureSVGRightPart);

        this.pressureSVGUnits = document.createElementNS(Avionics.SVG.NS, "text");
        this.pressureSVGUnits.textContent = "";
        this.pressureSVGUnits.setAttribute("id", "PressureSVGUnits");
        this.pressureSVGUnits.setAttribute("x", (posX + 16).toString());
        this.pressureSVGUnits.setAttribute("y", (posY + 30).toString());
        this.pressureSVGUnits.setAttribute("fill", "var(--cyan)");
        this.pressureSVGUnits.setAttribute("stroke", "black");
        this.pressureSVGUnits.setAttribute("stroke-width", "5px");
        this.pressureSVGUnits.setAttribute("font-size", (this.fontSize * 1.0).toString());
        this.pressureSVGUnits.setAttribute("font-family", "Roboto-Light");
        this.pressureSVGUnits.setAttribute("text-anchor", "left");
        this.rootGroup.appendChild(this.pressureSVGUnits);

        posY -= height;
        if (!this.centerSVG) {
            this.centerSVG = document.createElementNS(Avionics.SVG.NS, "svg");
            this.centerSVG.setAttribute("id", "CenterGroup");
        }
        else
            Utils.RemoveAllChildren(this.centerSVG);
        this.centerSVG.setAttribute("x", (posX - width * 0.5).toString());
        this.centerSVG.setAttribute("y", posY.toString());
        this.centerSVG.setAttribute("width", width.toString());
        this.centerSVG.setAttribute("height", height.toString());
        this.centerSVG.setAttribute("viewBox", "0 0 " + width + " " + height);
        this.centerSVG.setAttribute("overflow", "hidden");
        {
            var _top = 0;
            var _left = 0;
            var _width = width;
            var _height = height;
            var bg = document.createElementNS(Avionics.SVG.NS, "rect");
            diffAndSetAttribute(bg, "x", _left.toString());
            diffAndSetAttribute(bg, "y", _top.toString());
            diffAndSetAttribute(bg, "width", _width.toString());
            diffAndSetAttribute(bg, "height", _height.toString());
            diffAndSetAttribute(bg, "fill", "black");
            diffAndSetAttribute(bg, "fill-opacity", "0.4");
            this.centerSVG.appendChild(bg);

            this.radioMinsRect = document.createElementNS(Avionics.SVG.NS, "rect");
            this.radioMinsRect.setAttribute("id", "radioMins");
            this.radioMinsRect.setAttribute("fill", "none");
            this.radioMinsRect.setAttribute("stroke", "var(--cyan)");
            this.radioMinsRect.setAttribute("stroke-width", "2");
            this.radioMinsRect.setAttribute("x", "4");
            this.radioMinsRect.setAttribute("y", "0");
            this.radioMinsRect.setAttribute("width", "4");
            this.radioMinsRect.setAttribute("height", "100");
            this.centerSVG.appendChild(this.radioMinsRect);

            this.groundRibbonHasFixedHeight = true;
            var groundRibbonPosX = _left;
            var groundRibbonPosY = 0;
            var groundRibbonWidth = _width;
            var groundRibbonHeight = _height;
            if (!this.groundRibbonSVG) {
                this.groundRibbonSVG = document.createElementNS(Avionics.SVG.NS, "svg");
                this.groundRibbonSVG.setAttribute("id", "GroundRibbonGroup");
            }
            else
                Utils.RemoveAllChildren(this.groundRibbonSVG);
            this.groundRibbonSVG.setAttribute("x", groundRibbonPosX.toString());
            this.groundRibbonSVG.setAttribute("y", groundRibbonPosY.toString());
            this.groundRibbonSVG.setAttribute("width", groundRibbonWidth.toString());
            this.groundRibbonSVG.setAttribute("height", groundRibbonHeight.toString());
            this.groundRibbonSVG.setAttribute("viewBox", "0 0 " + groundRibbonWidth + " " + groundRibbonHeight);
            {
                var dashHeight = 6;
                var dashEndPos = _height;
                var dashPos = -240;
                while (dashPos < dashEndPos) {
                    let dashLine = document.createElementNS(Avionics.SVG.NS, "rect");
                    diffAndSetAttribute(dashLine, "x", "0");
                    diffAndSetAttribute(dashLine, "y", dashPos.toString());
                    diffAndSetAttribute(dashLine, "width", groundRibbonWidth.toString());
                    diffAndSetAttribute(dashLine, "height", dashHeight.toString());
                    diffAndSetAttribute(dashLine, "transform", "skewY(53)");
                    diffAndSetAttribute(dashLine, "fill", "var(--true-orange)");
                    this.groundRibbonSVG.appendChild(dashLine);
                    dashPos += dashHeight * 6.5;
                }
                if (!this.groundRibbonSVGShape)
                    this.groundRibbonSVGShape = document.createElementNS(Avionics.SVG.NS, "rect");
                this.groundRibbonSVGShape.setAttribute("fill", "var(--true-orange)");
                this.groundRibbonSVGShape.setAttribute("stroke", "var(--true-orange)");
                this.groundRibbonSVGShape.setAttribute("stroke-width", "2");
                this.groundRibbonSVGShape.setAttribute("width", groundRibbonWidth.toString());
                this.groundRibbonSVGShape.setAttribute("height", "2");
                this.groundRibbonSVGShape.setAttribute("x", "0");
                this.groundRibbonSVG.appendChild(this.groundRibbonSVGShape);
            }
            this.centerSVG.appendChild(this.groundRibbonSVG);

            this.graduationScrollPosX = _left + gradWidth;
            this.graduationScrollPosY = _top + _height * 0.5;
            for (var i = 0; i < this.totalGraduations; i++) {
                var line = new Avionics.SVGGraduation();
                line.IsPrimary = true;
                if (this.nbSecondaryGraduations > 0 && (i % (this.nbSecondaryGraduations + 1)))
                    line.IsPrimary = false;
                var lineWidth = line.IsPrimary ? 15 : 4;
                line.SVGLine = document.createElementNS(Avionics.SVG.NS, "rect");
                line.SVGLine.setAttribute("x", "-2");
                line.SVGLine.setAttribute("width", lineWidth.toString());
                line.SVGLine.setAttribute("height", "2");
                line.SVGLine.setAttribute("fill", "white");
                if (line.IsPrimary) {
                    line.SVGText1 = document.createElementNS(Avionics.SVG.NS, "text");
                    line.SVGText1.setAttribute("x", "-36");
                    line.SVGText1.setAttribute("y", "6");
                    line.SVGText1.setAttribute("fill", "white");
                    line.SVGText1.setAttribute("font-size", (this.fontSize).toString());
                    line.SVGText1.setAttribute("font-family", "Roboto-Light");
                    line.SVGText1.setAttribute("text-anchor", "end");
                    line.SVGText1.setAttribute("alignment-baseline", "central");
                    line.SVGText2 = document.createElementNS(Avionics.SVG.NS, "text");
                    line.SVGText2.setAttribute("x", "-34");
                    line.SVGText2.setAttribute("y", "4");
                    line.SVGText2.setAttribute("fill", "white");
                    line.SVGText2.setAttribute("font-size", (this.fontSize * 0.72).toString());
                    line.SVGText2.setAttribute("font-family", "Roboto-Light");
                    line.SVGText2.setAttribute("text-anchor", "start");
                    line.SVGText2.setAttribute("alignment-baseline", "central");
                }
                this.graduations.push(line);
            }
            var graduationGroup = document.createElementNS(Avionics.SVG.NS, "g");
            diffAndSetAttribute(graduationGroup, "id", "graduationGroup");
            for (var i = 0; i < this.totalGraduations; i++) {
                var line = this.graduations[i];
                graduationGroup.appendChild(line.SVGLine);
                if (line.SVGText1)
                    graduationGroup.appendChild(line.SVGText1);
                if (line.SVGText2)
                    graduationGroup.appendChild(line.SVGText2);
            }
            this.centerSVG.appendChild(graduationGroup);

            var cursorPosX = _left + 12;
            var cursorPosY = _top + _height * 0.5;
            var cursorWidth = width;
            var cursorHeight = 80;
            if (!this.cursorSVG) {
                this.cursorSVG = document.createElementNS(Avionics.SVG.NS, "svg");
                this.cursorSVG.setAttribute("id", "CursorGroup");
            }
            else
                Utils.RemoveAllChildren(this.cursorSVG);
            this.cursorSVG.setAttribute("x", cursorPosX.toString());
            this.cursorSVG.setAttribute("y", (cursorPosY - cursorHeight * 0.5 - 25).toString());
            this.cursorSVG.setAttribute("width", cursorWidth.toString());
            this.cursorSVG.setAttribute("height", (cursorHeight + 25).toString());
            this.cursorSVG.setAttribute("viewBox", "0 -25 " + cursorWidth + " " + (cursorHeight + 25));
            {
                this.cursorSVGDefs = document.createElementNS(Avionics.SVG.NS, "defs");
                this.cursorSVGClip = document.createElementNS(Avionics.SVG.NS, "clipPath");
                this.cursorSVGClip.setAttribute("id", "AltCursorClip");
                this.cursorSVGClipShape = document.createElementNS(Avionics.SVG.NS, "path");
                this.cursorSVGClipShape.setAttribute("d", "M 1 6 L 95 6 L 95 30 L 105 40 L 95 50 L 95 74 L 1 74 Z");
                this.cursorSVGClip.appendChild(this.cursorSVGClipShape);
                this.cursorSVGDefs.appendChild(this.cursorSVGClip);
                this.cursorSVG.appendChild(this.cursorSVGDefs);

                if (!this.cursorSVGShape)
                    this.cursorSVGShape = document.createElementNS(Avionics.SVG.NS, "path");
                this.cursorSVGShape.setAttribute("fill", "black");
                this.cursorSVGShape.setAttribute("d", "M0 5 L95 5 L95 30 L105 40 L95 50 L95 75 L0 75 Z");
                this.cursorSVGShape.setAttribute("stroke", "white");
                this.cursorSVGShape.setAttribute("stroke-width", "1.5");
                this.cursorSVG.appendChild(this.cursorSVGShape);
                var _cursorPosX = -3;
                var _cursorPosY = cursorHeight * 0.5;
                this.cursorSVGIntegralContainer = document.createElementNS(Avionics.SVG.NS, "g");
                this.cursorSVGIntegralContainer.setAttribute("clip-path", "url(#AltCursorClip)");
                this.cursorIntegrals[0].construct(this.cursorSVGIntegralContainer, _cursorPosX + 27, _cursorPosY + 5, _width, "Roboto-Bold", this.fontSize * 1.55, "var(--green)");
                this.cursorIntegrals[1].construct(this.cursorSVGIntegralContainer, _cursorPosX + 46, _cursorPosY + 5, _width, "Roboto-Bold", this.fontSize * 1.55, "var(--green)");
                this.cursorIntegrals[2].construct(this.cursorSVGIntegralContainer, _cursorPosX + 65, _cursorPosY + 5, _width, "Roboto-Bold", this.fontSize * 1.55, "var(--green)");
                this.cursorDecimals.construct(this.cursorSVGIntegralContainer, _cursorPosX + 93, _cursorPosY + 5, _width, "Roboto-Bold", this.fontSize * 0.95, "var(--green)");
                this.cursorSVG.appendChild(this.cursorSVGIntegralContainer);
                this.cursorM = document.createElementNS(Avionics.SVG.NS, "g");
                this.cursorM.setAttribute("visibility", "hidden");
                this.cursorMSVGShape = document.createElementNS(Avionics.SVG.NS, "rect");
                this.cursorMSVGShape.setAttribute("x", "0");
                this.cursorMSVGShape.setAttribute("y", "-25");
                this.cursorMSVGShape.setAttribute("width", "95");
                this.cursorMSVGShape.setAttribute("height", "30");
                this.cursorMSVGShape.setAttribute("fill", "black");
                this.cursorMSVGShape.setAttribute("stroke", "white");
                this.cursorMSVGShape.setAttribute("stroke-width", "1.5");
                this.cursorM.appendChild(this.cursorMSVGShape);
                this.CursorMNumber = document.createElementNS(Avionics.SVG.NS, "text");
                this.CursorMNumber.setAttribute("x", "75");
                this.CursorMNumber.setAttribute("y", "-1.5");
                this.CursorMNumber.setAttribute("font-size", (this.fontSize * 1).toString());
                this.CursorMNumber.setAttribute("text-anchor", "end");
                this.cursorM.appendChild(this.CursorMNumber);
                this.CursorMM = document.createElementNS(Avionics.SVG.NS, "text");
                this.CursorMM.textContent = "M";
                this.CursorMM.setAttribute("x", "90");
                this.CursorMM.setAttribute("y", "-1.5");
                this.CursorMM.setAttribute("font-size", (this.fontSize * 1).toString());
                this.CursorMM.setAttribute("text-anchor", "end");
                this.CursorMM.setAttribute("id", "MeterUnit");
                this.cursorM.appendChild(this.CursorMM);
                this.cursorSVG.appendChild(this.cursorM);
                this.centerSVG.appendChild(this.cursorSVG);
            }

            var targetAltitudeIndicatorPosX = gradWidth - 13;
            var targetAltitudeIndicatorPosY = _top + _height * 0.5;
            var targetAltitudeIndicatorWidth = 100;
            var targetAltitudeIndicatorHeight = 100;
            if (!this.targetAltitudeIndicatorSVG) {
                this.targetAltitudeIndicatorSVG = document.createElementNS(Avionics.SVG.NS, "svg");
                this.targetAltitudeIndicatorSVG.setAttribute("id", "TargetAltitudeIndicator");
            }
            else
                Utils.RemoveAllChildren(this.targetAltitudeIndicatorSVG);
            this.targetAltitudeIndicatorSVG.setAttribute("visibility", "hidden");
            this.targetAltitudeIndicatorSVG.setAttribute("x", targetAltitudeIndicatorPosX.toString());
            this.targetAltitudeIndicatorSVG.setAttribute("y", (targetAltitudeIndicatorPosY - targetAltitudeIndicatorHeight * 0.5).toString());
            this.targetAltitudeIndicatorSVG.setAttribute("width", targetAltitudeIndicatorWidth.toString());
            this.targetAltitudeIndicatorSVG.setAttribute("height", targetAltitudeIndicatorHeight.toString());
            this.targetAltitudeIndicatorSVG.setAttribute("viewBox", "0 0 100 100");
            {
                if (!this.targetAltitudeIndicatorSVGShape)
                    this.targetAltitudeIndicatorSVGShape = document.createElementNS(Avionics.SVG.NS, "path");
                this.targetAltitudeIndicatorSVGShape.setAttribute("fill", "none");
                this.targetAltitudeIndicatorSVGShape.setAttribute("stroke", "var(--cyan)");
                this.targetAltitudeIndicatorSVGShape.setAttribute("stroke-width", "3");
                this.targetAltitudeIndicatorSVGShape.setAttribute("d", "M 12 15 L 39 15 L 39 32 L 24 50 L 39 68 L 39 85 L 12 85");
                this.targetAltitudeIndicatorSVG.appendChild(this.targetAltitudeIndicatorSVGShape);
            }
            this.centerSVG.appendChild(this.targetAltitudeIndicatorSVG);

            var baroMinsPosX = gradWidth - 34;
            var baroMinsPosY = _top + _height * 0.5;
            var baroMinsWidth = 100;
            var baroMinsHeight = 100;
            if (!this.baroMinsSVG) {
                this.baroMinsSVG = document.createElementNS(Avionics.SVG.NS, "svg");
                this.baroMinsSVG.setAttribute("id", "BaroMinsIndicator");
            }
            else
                Utils.RemoveAllChildren(this.baroMinsSVG);
            this.baroMinsSVG.setAttribute("x", baroMinsPosX.toString());
            this.baroMinsSVG.setAttribute("y", (baroMinsPosY - baroMinsHeight * 0.5).toString());
            this.baroMinsSVG.setAttribute("width", baroMinsWidth.toString());
            this.baroMinsSVG.setAttribute("height", baroMinsHeight.toString());
            this.baroMinsSVG.setAttribute("viewBox", "-19 0 100 100");
            {
                if (!this.baroMinsShape)
                    this.baroMinsPointer = document.createElementNS(Avionics.SVG.NS, "path");
                this.baroMinsPointer.setAttribute("d", "M -50 50 L 24 50 L 39 30 L 39 70 L 24 50 Z");
                this.baroMinsPointer.setAttribute("fill", "none");
                this.baroMinsPointer.setAttribute("stroke", "var(--cyan)");
                this.baroMinsPointer.setAttribute("stroke-width", "2");
                this.baroMinsPointer.setAttribute("fill", "var(--cyan)");
                this.baroMinsSVG.appendChild(this.baroMinsPointer);
            }
            this.centerSVG.appendChild(this.baroMinsSVG);
        }
        this.rootGroup.appendChild(this.centerSVG);

        this.targetAltitudeM = document.createElementNS(Avionics.SVG.NS, "g");
        this.targetAltitudeM.setAttribute("id", "targetAltitudeM");
        this.targetAltitudeM.setAttribute("visibility", "hidden");
        this.targetAltitudeMBgSVG = document.createElementNS(Avionics.SVG.NS, "rect");
        this.targetAltitudeMBgSVG.setAttribute("fill", "black");
        this.targetAltitudeMBgSVG.setAttribute("x", "22");
        this.targetAltitudeMBgSVG.setAttribute("y", (posY - 30).toString());
        this.targetAltitudeMBgSVG.setAttribute("width", "87");
        this.targetAltitudeMBgSVG.setAttribute("height", "25");
        this.targetAltitudeMBgSVG.setAttribute("fill-opacity", "0.5");
        this.targetAltitudeM.appendChild(this.targetAltitudeMBgSVG);
        this.targetAltitudeMTextSVG1 = document.createElementNS(Avionics.SVG.NS, "text");
        this.targetAltitudeMTextSVG1.textContent = "-----";
        this.targetAltitudeMTextSVG1.setAttribute("x", "92");
        this.targetAltitudeMTextSVG1.setAttribute("y", (posY - 10).toString());
        this.targetAltitudeMTextSVG1.setAttribute("width", _width.toString());
        this.targetAltitudeMTextSVG1.setAttribute("fill", "var(--cyan)");
        this.targetAltitudeMTextSVG1.setAttribute("font-size", (this.fontSize * 1.0).toString());
        this.targetAltitudeMTextSVG1.setAttribute("font-family", "Roboto-Light");
        this.targetAltitudeMTextSVG1.setAttribute("text-anchor", "end");
        this.targetAltitudeMTextSVG1.setAttribute("alignment-baseline", "bottom");
        this.targetAltitudeM.appendChild(this.targetAltitudeMTextSVG1);
        this.targetAltitudeMTextSVG2 = document.createElementNS(Avionics.SVG.NS, "text");
        this.targetAltitudeMTextSVG2.textContent = "M";
        this.targetAltitudeMTextSVG2.setAttribute("x", "107");
        this.targetAltitudeMTextSVG2.setAttribute("y", (posY - 10).toString());
        this.targetAltitudeMTextSVG2.setAttribute("fill", "var(--cyan)");
        this.targetAltitudeMTextSVG2.setAttribute("font-size", (this.fontSize * 1.0).toString());
        this.targetAltitudeMTextSVG2.setAttribute("font-family", "Roboto-Light");
        this.targetAltitudeMTextSVG2.setAttribute("text-anchor", "end");
        this.targetAltitudeMTextSVG2.setAttribute("alignment-baseline", "bottom");
        this.targetAltitudeM.appendChild(this.targetAltitudeMTextSVG2);
        this.rootGroup.appendChild(this.targetAltitudeM);

        this.targetAltitude = document.createElementNS(Avionics.SVG.NS, "g");
        this.targetAltitude.setAttribute("id", "TargetAltitude");
        this.targetAltitude.setAttribute("visibility", "hidden");
        this.targetAltitudeBgSVG = document.createElementNS(Avionics.SVG.NS, "rect");
        this.targetAltitudeBgSVG.setAttribute("fill", "black");
        this.targetAltitudeBgSVG.setAttribute("x", "3");
        this.targetAltitudeBgSVG.setAttribute("y", (posY - 45).toString());
        this.targetAltitudeBgSVG.setAttribute("width", "110");
        this.targetAltitudeBgSVG.setAttribute("height", "43");
        this.targetAltitudeBgSVG.setAttribute("fill-opacity", "0.4");
        this.targetAltitude.appendChild(this.targetAltitudeBgSVG);
        this.targetAltitudeTextSVG1 = document.createElementNS(Avionics.SVG.NS, "text");
        this.targetAltitudeTextSVG1.setAttribute("x", "78");
        this.targetAltitudeTextSVG1.setAttribute("y", (posY - 5).toString());
        this.targetAltitudeTextSVG1.setAttribute("fill", "var(--cyan)");
        this.targetAltitudeTextSVG1.setAttribute("font-size", (this.fontSize * 1.7).toString());
        this.targetAltitudeTextSVG1.setAttribute("font-family", "Roboto-Light");
        this.targetAltitudeTextSVG1.setAttribute("letter-spacing", "2");
        this.targetAltitudeTextSVG1.setAttribute("text-anchor", "end");
        this.targetAltitudeTextSVG1.setAttribute("alignment-baseline", "bottom");
        this.targetAltitude.appendChild(this.targetAltitudeTextSVG1);
        this.targetAltitudeTextSVG2 = document.createElementNS(Avionics.SVG.NS, "text");
        this.targetAltitudeTextSVG2.textContent = "-----";
        this.targetAltitudeTextSVG2.setAttribute("x", "30");
        this.targetAltitudeTextSVG2.setAttribute("y", (posY - 5).toString());
        this.targetAltitudeTextSVG2.setAttribute("width", _width.toString());
        this.targetAltitudeTextSVG2.setAttribute("fill", "var(--cyan)");
        this.targetAltitudeTextSVG2.setAttribute("font-size", (this.fontSize * 1.0).toString());
        this.targetAltitudeTextSVG2.setAttribute("font-family", "Roboto-Light");
        this.targetAltitudeTextSVG2.setAttribute("text-anchor", "start");
        this.targetAltitudeTextSVG2.setAttribute("alignment-baseline", "bottom");
        this.targetAltitude.appendChild(this.targetAltitudeTextSVG2);
        this.rootGroup.appendChild(this.targetAltitude);

        let borderline = document.createElementNS(Avionics.SVG.NS, "line");
        let blx = "140";
        diffAndSetAttribute(borderline, "x1", blx);
        diffAndSetAttribute(borderline, "y1", "37");
        diffAndSetAttribute(borderline, "x2", blx);
        diffAndSetAttribute(borderline, "y2", "453");
        diffAndSetAttribute(borderline, "stroke", "#909090");
        diffAndSetAttribute(borderline, "stroke-width", "3");
        this.rootGroup.appendChild(borderline);

        this.rootSVG.appendChild(this.rootGroup);
        this.appendChild(this.rootSVG);
    }
    construct_B747_8() {
        this.rootSVG = document.createElementNS(Avionics.SVG.NS, "svg");
        this.rootSVG.setAttribute("id", "ViewBox");
        this.rootSVG.setAttribute("viewBox", "0 0 250 800");
        var posX = 100;
        var posY = 0;
        var width = 105;
        var height = 640;
        var arcWidth = 70;
        this.refHeight = height;
        this.nbSecondaryGraduations = 1;
        this.totalGraduations = this.nbPrimaryGraduations + ((this.nbPrimaryGraduations - 1) * this.nbSecondaryGraduations);
        this.graduationSpacing = 80;
        this.graduationScroller = new Avionics.Scroller(this.nbPrimaryGraduations, 200, true);
        this.cursorIntegrals = new Array();
        this.cursorIntegrals.push(new Avionics.AltitudeScroller(3, 55, 1, 10, 1000));
        this.cursorIntegrals.push(new Avionics.AltitudeScroller(3, 55, 1, 10, 100));
        this.cursorIntegrals.push(new Avionics.AltitudeScroller(3, 55, 1, 10, 10));
        this.cursorDecimals = new Avionics.AltitudeScroller(5, 25, 20, 100);
        if (!this.rootGroup) {
            this.rootGroup = document.createElementNS(Avionics.SVG.NS, "g");
            this.rootGroup.setAttribute("id", "Altimeter");
        }
        else {
            Utils.RemoveAllChildren(this.rootGroup);
        }
        var sideTextHeight = 70;
        posY += sideTextHeight * 0.5;
        this.targetAltitudeTextSVG1 = document.createElementNS(Avionics.SVG.NS, "text");
        this.targetAltitudeTextSVG1.setAttribute("x", "115");
        this.targetAltitudeTextSVG1.setAttribute("y", (posY + sideTextHeight * 0.5).toString());
        this.targetAltitudeTextSVG1.setAttribute("fill", "#D570FF");
        this.targetAltitudeTextSVG1.setAttribute("font-size", (this.fontSize * 1.6).toString());
        this.targetAltitudeTextSVG1.setAttribute("font-family", "Roboto-Bold");
        this.targetAltitudeTextSVG1.setAttribute("text-anchor", "end");
        this.targetAltitudeTextSVG1.setAttribute("alignment-baseline", "bottom");
        this.rootGroup.appendChild(this.targetAltitudeTextSVG1);
        this.targetAltitudeTextSVG2 = document.createElementNS(Avionics.SVG.NS, "text");
        this.targetAltitudeTextSVG2.setAttribute("x", "115");
        this.targetAltitudeTextSVG2.setAttribute("y", (posY + sideTextHeight * 0.5).toString());
        this.targetAltitudeTextSVG2.setAttribute("width", width.toString());
        this.targetAltitudeTextSVG2.setAttribute("fill", "#D570FF");
        this.targetAltitudeTextSVG2.setAttribute("font-size", (this.fontSize * 1.3).toString());
        this.targetAltitudeTextSVG2.setAttribute("font-family", "Roboto-Bold");
        this.targetAltitudeTextSVG2.setAttribute("text-anchor", "start");
        this.targetAltitudeTextSVG2.setAttribute("alignment-baseline", "bottom");
        this.rootGroup.appendChild(this.targetAltitudeTextSVG2);
        posY += sideTextHeight * 0.835;
        if (!this.centerSVG) {
            this.centerSVG = document.createElementNS(Avionics.SVG.NS, "svg");
            this.centerSVG.setAttribute("id", "CenterGroup");
        }
        else
            Utils.RemoveAllChildren(this.centerSVG);
        this.centerSVG.setAttribute("x", (posX - width * 0.5).toString());
        this.centerSVG.setAttribute("y", posY.toString());
        this.centerSVG.setAttribute("width", (width + arcWidth).toString());
        this.centerSVG.setAttribute("height", height.toString());
        this.centerSVG.setAttribute("viewBox", "0 0 " + (width + arcWidth) + " " + height);
        {
            var _top = 0;
            var _left = 20;
            var _width = width;
            var _height = height;
            var bg = document.createElementNS(Avionics.SVG.NS, "rect");
            diffAndSetAttribute(bg, "x", _left.toString());
            diffAndSetAttribute(bg, "y", _top.toString());
            diffAndSetAttribute(bg, "width", _width.toString());
            diffAndSetAttribute(bg, "height", _height.toString());
            diffAndSetAttribute(bg, "fill", "#343B51");
            this.centerSVG.appendChild(bg);
            this.graduationScrollPosX = _left;
            this.graduationScrollPosY = _top + _height * 0.5;
            for (var i = 0; i < this.totalGraduations; i++) {
                var line = new Avionics.SVGGraduation();
                line.IsPrimary = true;
                if (this.nbSecondaryGraduations > 0 && (i % (this.nbSecondaryGraduations + 1)))
                    line.IsPrimary = false;
                var lineWidth = (line.IsPrimary) ? 22 : 22;
                var lineHeight = (line.IsPrimary) ? 3 : 3;
                line.SVGLine = document.createElementNS(Avionics.SVG.NS, "rect");
                line.SVGLine.setAttribute("x", "0");
                line.SVGLine.setAttribute("width", lineWidth.toString());
                line.SVGLine.setAttribute("height", lineHeight.toString());
                line.SVGLine.setAttribute("fill", "white");
                this.centerSVG.appendChild(line.SVGLine);
                if (line.IsPrimary) {
                    var xPos = lineWidth + 40;
                    line.SVGText1 = document.createElementNS(Avionics.SVG.NS, "text");
                    line.SVGText1.setAttribute("x", xPos.toString());
                    line.SVGText1.setAttribute("y", "10");
                    line.SVGText1.setAttribute("fill", "white");
                    line.SVGText1.setAttribute("font-size", (this.fontSize * 1.15).toString());
                    line.SVGText1.setAttribute("font-family", "Roboto-Bold");
                    line.SVGText1.setAttribute("text-anchor", "end");
                    line.SVGText1.setAttribute("alignment-baseline", "bottom");
                    this.centerSVG.appendChild(line.SVGText1);
                    line.SVGText2 = document.createElementNS(Avionics.SVG.NS, "text");
                    line.SVGText2.setAttribute("x", xPos.toString());
                    line.SVGText2.setAttribute("y", "10");
                    line.SVGText2.setAttribute("fill", "white");
                    line.SVGText2.setAttribute("font-size", (this.fontSize * 0.85).toString());
                    line.SVGText2.setAttribute("font-family", "Roboto-Bold");
                    line.SVGText2.setAttribute("text-anchor", "start");
                    line.SVGText2.setAttribute("alignment-baseline", "bottom");
                    this.centerSVG.appendChild(line.SVGText2);
                }
                this.graduations.push(line);
            }
            this.groundRibbonHasFixedHeight = true;
            var groundRibbonPosX = _left;
            var groundRibbonPosY = 0;
            var groundRibbonWidth = _width;
            var groundRibbonHeight = 40;
            if (!this.groundRibbonSVG) {
                this.groundRibbonSVG = document.createElementNS(Avionics.SVG.NS, "svg");
                this.groundRibbonSVG.setAttribute("id", "GroundRibbonGroup");
            }
            else
                Utils.RemoveAllChildren(this.groundRibbonSVG);
            this.groundRibbonSVG.setAttribute("x", groundRibbonPosX.toString());
            this.groundRibbonSVG.setAttribute("y", groundRibbonPosY.toString());
            this.groundRibbonSVG.setAttribute("width", groundRibbonWidth.toString());
            this.groundRibbonSVG.setAttribute("height", groundRibbonHeight.toString());
            this.groundRibbonSVG.setAttribute("viewBox", "0 0 " + groundRibbonWidth + " " + groundRibbonHeight);
            {
                var dashHeight = 5;
                var dashEndPos = _height;
                var dashPos = -100;
                while (dashPos < (dashEndPos - dashHeight * 2)) {
                    let dashLine = document.createElementNS(Avionics.SVG.NS, "rect");
                    diffAndSetAttribute(dashLine, "x", "0");
                    diffAndSetAttribute(dashLine, "y", dashPos.toString());
                    diffAndSetAttribute(dashLine, "width", groundRibbonWidth.toString());
                    diffAndSetAttribute(dashLine, "height", dashHeight.toString());
                    diffAndSetAttribute(dashLine, "transform", "skewY(45)");
                    diffAndSetAttribute(dashLine, "fill", "orange");
                    this.groundRibbonSVG.appendChild(dashLine);
                    dashPos += dashHeight * 2;
                }
                if (!this.groundRibbonSVGShape)
                    this.groundRibbonSVGShape = document.createElementNS(Avionics.SVG.NS, "rect");
                this.groundRibbonSVGShape.setAttribute("fill", "orange");
                this.groundRibbonSVGShape.setAttribute("stroke", "orange");
                this.groundRibbonSVGShape.setAttribute("stroke-width", "2");
                this.groundRibbonSVGShape.setAttribute("width", groundRibbonWidth.toString());
                this.groundRibbonSVGShape.setAttribute("height", "5");
                this.groundRibbonSVGShape.setAttribute("x", "0");
                this.groundRibbonSVG.appendChild(this.groundRibbonSVGShape);
            }
            this.centerSVG.appendChild(this.groundRibbonSVG);
            let singleLineHeight = 500 * this.graduationSpacing * (this.nbSecondaryGraduations + 1) / this.graduationScroller.increment;
            let groundStripPosX = _left;
            let groundStripPosY = 0;
            let groundStripWidth = width;
            this.groundLineSVGHeight = singleLineHeight * 2;
            if (!this.groundLineSVG) {
                this.groundLineSVG = document.createElementNS(Avionics.SVG.NS, "svg");
                this.groundLineSVG.setAttribute("id", "GroundLineGroup");
            }
            else
                Utils.RemoveAllChildren(this.groundLineSVG);
            this.groundLineSVG.setAttribute("x", groundStripPosX.toString());
            this.groundLineSVG.setAttribute("y", groundStripPosY.toString());
            this.groundLineSVG.setAttribute("width", groundStripWidth.toString());
            this.groundLineSVG.setAttribute("height", this.groundLineSVGHeight.toString());
            this.groundLineSVG.setAttribute("viewBox", "0 0 " + groundStripWidth + " " + this.groundLineSVGHeight);
            {
                let whiteLine = document.createElementNS(Avionics.SVG.NS, "rect");
                diffAndSetAttribute(whiteLine, "fill", "white");
                diffAndSetAttribute(whiteLine, "x", "0");
                diffAndSetAttribute(whiteLine, "y", "0");
                diffAndSetAttribute(whiteLine, "width", "5");
                diffAndSetAttribute(whiteLine, "height", singleLineHeight.toString());
                this.groundLineSVG.appendChild(whiteLine);
                let amberLine = document.createElementNS(Avionics.SVG.NS, "rect");
                diffAndSetAttribute(amberLine, "fill", "orange");
                diffAndSetAttribute(amberLine, "x", "0");
                diffAndSetAttribute(amberLine, "y", singleLineHeight.toString());
                diffAndSetAttribute(amberLine, "width", "5");
                diffAndSetAttribute(amberLine, "height", singleLineHeight.toString());
                this.groundLineSVG.appendChild(amberLine);
            }
            this.centerSVG.appendChild(this.groundLineSVG);
            this.thousandIndicator = document.createElementNS(Avionics.SVG.NS, "g");
            this.thousandIndicator.setAttribute("id", "thousandGroup");
            {
                let topLine = document.createElementNS(Avionics.SVG.NS, "line");
                diffAndSetAttribute(topLine, "x1", (_left + 5).toString());
                diffAndSetAttribute(topLine, "y1", "-18");
                diffAndSetAttribute(topLine, "x2", _width.toString());
                diffAndSetAttribute(topLine, "y2", "-18");
                diffAndSetAttribute(topLine, "stroke", "white");
                diffAndSetAttribute(topLine, "stroke-width", "3");
                this.thousandIndicator.appendChild(topLine);
                let bottomLine = document.createElementNS(Avionics.SVG.NS, "line");
                diffAndSetAttribute(bottomLine, "x1", (_left + 5).toString());
                diffAndSetAttribute(bottomLine, "y1", "18");
                diffAndSetAttribute(bottomLine, "x2", _width.toString());
                diffAndSetAttribute(bottomLine, "y2", "18");
                diffAndSetAttribute(bottomLine, "stroke", "white");
                diffAndSetAttribute(bottomLine, "stroke-width", "3");
                this.thousandIndicator.appendChild(bottomLine);
            }
            this.centerSVG.appendChild(this.thousandIndicator);
            var targetAltitudeIndicatorWidth = 100;
            var targetAltitudeIndicatorHeight = 100;
            var targetAltitudeIndicatorPosX = 0;
            if (!this.targetAltitudeIndicatorSVG) {
                this.targetAltitudeIndicatorSVG = document.createElementNS(Avionics.SVG.NS, "svg");
                this.targetAltitudeIndicatorSVG.setAttribute("id", "TargetAltitudeIndicator");
            }
            else
                Utils.RemoveAllChildren(this.targetAltitudeIndicatorSVG);
            this.targetAltitudeIndicatorSVG.setAttribute("x", targetAltitudeIndicatorPosX.toString());
            this.targetAltitudeIndicatorSVG.setAttribute("width", targetAltitudeIndicatorWidth.toString());
            this.targetAltitudeIndicatorSVG.setAttribute("height", targetAltitudeIndicatorHeight.toString());
            this.targetAltitudeIndicatorSVG.setAttribute("viewBox", "0 0 100 100");
            {
                if (!this.targetAltitudeIndicatorSVGShape)
                    this.targetAltitudeIndicatorSVGShape = document.createElementNS(Avionics.SVG.NS, "path");
                this.targetAltitudeIndicatorSVGShape.setAttribute("fill", "none");
                this.targetAltitudeIndicatorSVGShape.setAttribute("stroke", "#D570FF");
                this.targetAltitudeIndicatorSVGShape.setAttribute("stroke-width", "2");
                this.targetAltitudeIndicatorSVGShape.setAttribute("d", "M 10 10 L 50 10 L 50 90 L 10 90 L 10 60 L 18 50 L 10 40 Z");
                this.targetAltitudeIndicatorSVG.appendChild(this.targetAltitudeIndicatorSVGShape);
            }
            this.centerSVG.appendChild(this.targetAltitudeIndicatorSVG);
            var cursorPosX = _left + 15;
            var cursorPosY = _top + _height * 0.5 + 2;
            var cursorWidth = width + arcWidth;
            var cursorHeight = 80;
            if (!this.cursorSVG) {
                this.cursorSVG = document.createElementNS(Avionics.SVG.NS, "svg");
                this.cursorSVG.setAttribute("id", "CursorGroup");
            }
            else
                Utils.RemoveAllChildren(this.cursorSVG);
            this.cursorSVG.setAttribute("x", cursorPosX.toString());
            this.cursorSVG.setAttribute("y", (cursorPosY - cursorHeight * 0.5).toString());
            this.cursorSVG.setAttribute("width", cursorWidth.toString());
            this.cursorSVG.setAttribute("height", cursorHeight.toString());
            this.cursorSVG.setAttribute("viewBox", "0 0 " + cursorWidth + " " + cursorHeight);
            {
                var _cursorPosX = 21;
                var _cursorPosY = cursorHeight * 0.5;
                if (!this.cursorSVGShape)
                    this.cursorSVGShape = document.createElementNS(Avionics.SVG.NS, "path");
                this.cursorSVGShape.setAttribute("fill", "black");
                this.cursorSVGShape.setAttribute("d", "M 15 0 L 130 0 L 130 80 L 15 80 L 15 53 L 0 40 L 15 27 Z");
                this.cursorSVGShape.setAttribute("stroke", "white");
                this.cursorSVGShape.setAttribute("stroke-width", this.strokeSize);
                this.cursorSVG.appendChild(this.cursorSVGShape);
                this.cursorIntegrals[0].construct(this.cursorSVG, _cursorPosX + 19, _cursorPosY, _width, "Roboto-Bold", this.fontSize * 1.6, "white");
                this.cursorIntegrals[1].construct(this.cursorSVG, _cursorPosX + 44, _cursorPosY, _width, "Roboto-Bold", this.fontSize * 1.6, "white");
                this.cursorIntegrals[2].construct(this.cursorSVG, _cursorPosX + 69, _cursorPosY, _width, "Roboto-Bold", this.fontSize * 1.6, "white");
                this.cursorDecimals.construct(this.cursorSVG, _cursorPosX + 104, _cursorPosY, _width, "Roboto-Bold", this.fontSize * 1.15, "white");
                if (!this.cursorSVGAltitudeLevelShape)
                    this.cursorSVGAltitudeLevelShape = document.createElementNS(Avionics.SVG.NS, "rect");
                this.cursorSVGAltitudeLevelShape.setAttribute("fill", "#24F000");
                this.cursorSVGAltitudeLevelShape.setAttribute("x", "18");
                this.cursorSVGAltitudeLevelShape.setAttribute("y", ((cursorHeight * 0.62) * 0.5).toString());
                this.cursorSVGAltitudeLevelShape.setAttribute("width", "20");
                this.cursorSVGAltitudeLevelShape.setAttribute("height", (cursorHeight * 0.4).toString());
                this.cursorSVG.appendChild(this.cursorSVGAltitudeLevelShape);
            }
            this.centerSVG.appendChild(this.cursorSVG);
        }
        this.rootGroup.appendChild(this.centerSVG);
        let mtrsGroup = document.createElementNS(Avionics.SVG.NS, "g");
        diffAndSetAttribute(mtrsGroup, "id", "MetersGroup");
        {
            this.mtrsSelectedGroup = document.createElementNS(Avionics.SVG.NS, "g");
            this.mtrsSelectedGroup.setAttribute("id", "SelectedGroup");
            {
                this.mtrsSelectedSVGText = document.createElementNS(Avionics.SVG.NS, "text");
                this.mtrsSelectedSVGText.setAttribute("x", "158");
                this.mtrsSelectedSVGText.setAttribute("y", (sideTextHeight * 0.5).toString());
                this.mtrsSelectedSVGText.setAttribute("fill", "#D570FF");
                this.mtrsSelectedSVGText.setAttribute("font-size", (this.fontSize * 1.2).toString());
                this.mtrsSelectedSVGText.setAttribute("font-family", "Roboto-Bold");
                this.mtrsSelectedSVGText.setAttribute("text-anchor", "end");
                this.mtrsSelectedSVGText.setAttribute("alignment-baseline", "bottom");
                this.mtrsSelectedGroup.appendChild(this.mtrsSelectedSVGText);
                var mtrsSelectedSVGUnit = document.createElementNS(Avionics.SVG.NS, "text");
                diffAndSetText(mtrsSelectedSVGUnit, "M");
                diffAndSetAttribute(mtrsSelectedSVGUnit, "x", "158");
                diffAndSetAttribute(mtrsSelectedSVGUnit, "y", (sideTextHeight * 0.5).toString());
                diffAndSetAttribute(mtrsSelectedSVGUnit, "fill", "cyan");
                diffAndSetAttribute(mtrsSelectedSVGUnit, "font-size", (this.fontSize * 0.9).toString());
                diffAndSetAttribute(mtrsSelectedSVGUnit, "font-family", "Roboto-Bold");
                diffAndSetAttribute(mtrsSelectedSVGUnit, "text-anchor", "start");
                diffAndSetAttribute(mtrsSelectedSVGUnit, "alignment-baseline", "bottom");
                this.mtrsSelectedGroup.appendChild(mtrsSelectedSVGUnit);
            }
            mtrsGroup.appendChild(this.mtrsSelectedGroup);
            var mtrsCursorPosX = _left + 62.5;
            var mtrsCursorPosY = _top + _height * 0.558;
            var mtrsCursorWidth = width + arcWidth;
            var mtrsCursorHeight = 36;
            this.mtrsCursorGroup = document.createElementNS(Avionics.SVG.NS, "svg");
            this.mtrsCursorGroup.setAttribute("id", "MetersCursorGroup");
            this.mtrsCursorGroup.setAttribute("x", mtrsCursorPosX.toString());
            this.mtrsCursorGroup.setAttribute("y", (mtrsCursorPosY - mtrsCursorHeight * 0.5).toString());
            this.mtrsCursorGroup.setAttribute("width", mtrsCursorWidth.toString());
            this.mtrsCursorGroup.setAttribute("height", mtrsCursorHeight.toString());
            this.mtrsCursorGroup.setAttribute("viewBox", "0 0 " + mtrsCursorWidth + " " + mtrsCursorHeight);
            {
                var mtrsCursorSVGShape = document.createElementNS(Avionics.SVG.NS, "path");
                diffAndSetAttribute(mtrsCursorSVGShape, "fill", "black");
                diffAndSetAttribute(mtrsCursorSVGShape, "d", "M 15 0 L 130 0 L 130 36 L 15 36 Z");
                diffAndSetAttribute(mtrsCursorSVGShape, "stroke", "white");
                diffAndSetAttribute(mtrsCursorSVGShape, "stroke-width", this.strokeSize);
                this.mtrsCursorGroup.appendChild(mtrsCursorSVGShape);
                this.mtrsCursorSVGText = document.createElementNS(Avionics.SVG.NS, "text");
                this.mtrsCursorSVGText.setAttribute("x", "110");
                this.mtrsCursorSVGText.setAttribute("y", (mtrsCursorHeight * 0.84).toString());
                this.mtrsCursorSVGText.setAttribute("fill", "white");
                this.mtrsCursorSVGText.setAttribute("font-size", (this.fontSize * 1.2).toString());
                this.mtrsCursorSVGText.setAttribute("font-family", "Roboto-Bold");
                this.mtrsCursorSVGText.setAttribute("text-anchor", "end");
                this.mtrsCursorSVGText.setAttribute("alignment-baseline", "bottom");
                this.mtrsCursorGroup.appendChild(this.mtrsCursorSVGText);
                let mtrsCursorSVGUnit = document.createElementNS(Avionics.SVG.NS, "text");
                diffAndSetText(mtrsCursorSVGUnit, "M");
                diffAndSetAttribute(mtrsCursorSVGUnit, "x", "110");
                diffAndSetAttribute(mtrsCursorSVGUnit, "y", (mtrsCursorHeight * 0.84).toString());
                diffAndSetAttribute(mtrsCursorSVGUnit, "fill", "cyan");
                diffAndSetAttribute(mtrsCursorSVGUnit, "font-size", (this.fontSize * 0.9).toString());
                diffAndSetAttribute(mtrsCursorSVGUnit, "font-family", "Roboto-Bold");
                diffAndSetAttribute(mtrsCursorSVGUnit, "text-anchor", "start");
                diffAndSetAttribute(mtrsCursorSVGUnit, "alignment-baseline", "bottom");
                this.mtrsCursorGroup.appendChild(mtrsCursorSVGUnit);
            }
            mtrsGroup.appendChild(this.mtrsCursorGroup);
        }
        this.rootGroup.appendChild(mtrsGroup);
        if (!this.pressureSVG)
            this.pressureSVG = document.createElementNS(Avionics.SVG.NS, "text");
        this.pressureSVG.textContent = "";
        this.pressureSVG.setAttribute("x", "170");
        this.pressureSVG.setAttribute("y", (posY + height + sideTextHeight * 0.5).toString());
        this.pressureSVG.setAttribute("fill", "#24F000");
        this.pressureSVG.setAttribute("font-size", (this.fontSize * 1.0).toString());
        this.pressureSVG.setAttribute("font-family", "Roboto-Bold");
        this.pressureSVG.setAttribute("text-anchor", "end");
        this.pressureSVG.setAttribute("alignment-baseline", "central");
        this.pressureSVG.setAttribute("letter-spacing", "-3px");
        this.rootGroup.appendChild(this.pressureSVG);
        this.rootSVG.appendChild(this.rootGroup);
        this.appendChild(this.rootSVG);
    }
    construct_AS01B() {
        this.rootSVG = document.createElementNS(Avionics.SVG.NS, "svg");
        this.rootSVG.setAttribute("id", "ViewBox");
        this.rootSVG.setAttribute("viewBox", "0 0 250 800");
        var posX = 100;
        var posY = 30;
        var width = 105;
        var height = 640;
        var arcWidth = 70;
        this.refHeight = height;
        this.nbSecondaryGraduations = 1;
        this.totalGraduations = this.nbPrimaryGraduations + ((this.nbPrimaryGraduations - 1) * this.nbSecondaryGraduations);
        this.graduationSpacing = 80;
        this.graduationScroller = new Avionics.Scroller(this.nbPrimaryGraduations, 200, true);
        this.cursorIntegrals = new Array();
        this.cursorIntegrals.push(new Avionics.AltitudeScroller(3, 55, 1, 10, 1000));
        this.cursorIntegrals.push(new Avionics.AltitudeScroller(3, 55, 1, 10, 100));
        this.cursorIntegrals.push(new Avionics.AltitudeScroller(3, 55, 1, 10, 10));
        this.cursorDecimals = new Avionics.AltitudeScroller(5, 25, 20, 100);
        if (!this.rootGroup) {
            this.rootGroup = document.createElementNS(Avionics.SVG.NS, "g");
            this.rootGroup.setAttribute("id", "Altimeter");
        }
        else {
            Utils.RemoveAllChildren(this.rootGroup);
        }
        var sideTextHeight = 75;
        if (!this.isHud) {
            this.targetAltitudeBgSVG = document.createElementNS(Avionics.SVG.NS, "rect");
            this.targetAltitudeBgSVG.setAttribute("x", "67.5");
            this.targetAltitudeBgSVG.setAttribute("y", (posY + 15).toString());
            this.targetAltitudeBgSVG.setAttribute("width", "105");
            this.targetAltitudeBgSVG.setAttribute("height", "44");
            this.targetAltitudeBgSVG.setAttribute("fill", "black");
            this.rootGroup.appendChild(this.targetAltitudeBgSVG);
        }
        this.targetAltitudeTextSVG1 = document.createElementNS(Avionics.SVG.NS, "text");
        this.targetAltitudeTextSVG1.setAttribute("x", "115");
        this.targetAltitudeTextSVG1.setAttribute("y", (posY + sideTextHeight * 0.5 + 12).toString());
        this.targetAltitudeTextSVG1.setAttribute("fill", (this.isHud) ? "lime" : "#D570FF");
        this.targetAltitudeTextSVG1.setAttribute("font-size", (this.fontSize * 1.55).toString());
        this.targetAltitudeTextSVG1.setAttribute("font-family", "Roboto-Bold");
        this.targetAltitudeTextSVG1.setAttribute("text-anchor", "end");
        this.targetAltitudeTextSVG1.setAttribute("alignment-baseline", "bottom");
        this.rootGroup.appendChild(this.targetAltitudeTextSVG1);
        this.targetAltitudeTextSVG2 = document.createElementNS(Avionics.SVG.NS, "text");
        this.targetAltitudeTextSVG2.setAttribute("x", "115");
        this.targetAltitudeTextSVG2.setAttribute("y", (posY + sideTextHeight * 0.5 + 12).toString());
        this.targetAltitudeTextSVG2.setAttribute("width", width.toString());
        this.targetAltitudeTextSVG2.setAttribute("fill", (this.isHud) ? "lime" : "#D570FF");
        this.targetAltitudeTextSVG2.setAttribute("font-size", (this.fontSize * 1.25).toString());
        this.targetAltitudeTextSVG2.setAttribute("font-family", "Roboto-Bold");
        this.targetAltitudeTextSVG2.setAttribute("text-anchor", "start");
        this.targetAltitudeTextSVG2.setAttribute("alignment-baseline", "bottom");
        this.rootGroup.appendChild(this.targetAltitudeTextSVG2);
        posY += sideTextHeight;
        if (!this.centerSVG) {
            this.centerSVG = document.createElementNS(Avionics.SVG.NS, "svg");
            this.centerSVG.setAttribute("id", "CenterGroup");
        }
        else
            Utils.RemoveAllChildren(this.centerSVG);
        this.centerSVG.setAttribute("x", (posX - width * 0.5).toString());
        this.centerSVG.setAttribute("y", posY.toString());
        this.centerSVG.setAttribute("width", (width + arcWidth).toString());
        this.centerSVG.setAttribute("height", height.toString());
        this.centerSVG.setAttribute("viewBox", "0 0 " + (width + arcWidth) + " " + height);
        {
            var _top = 0;
            var _left = 20;
            var _width = width;
            var _height = height;
            if (this.isHud) {
                var topLine = document.createElementNS(Avionics.SVG.NS, "line");
                diffAndSetAttribute(topLine, "x1", _left.toString());
                diffAndSetAttribute(topLine, "y1", _top.toString());
                diffAndSetAttribute(topLine, "x2", (_left + _width).toString());
                diffAndSetAttribute(topLine, "y2", _top.toString());
                diffAndSetAttribute(topLine, "stroke", "lime");
                diffAndSetAttribute(topLine, "stroke-width", "6");
                this.centerSVG.appendChild(topLine);
                var verticalLine = document.createElementNS(Avionics.SVG.NS, "line");
                diffAndSetAttribute(verticalLine, "x1", _left.toString());
                diffAndSetAttribute(verticalLine, "y1", _top.toString());
                diffAndSetAttribute(verticalLine, "x2", _left.toString());
                diffAndSetAttribute(verticalLine, "y2", (_top + _height).toString());
                diffAndSetAttribute(verticalLine, "stroke", "lime");
                diffAndSetAttribute(verticalLine, "stroke-width", "6");
                this.centerSVG.appendChild(verticalLine);
                var bottomLine = document.createElementNS(Avionics.SVG.NS, "line");
                diffAndSetAttribute(bottomLine, "x1", _left.toString());
                diffAndSetAttribute(bottomLine, "y1", (_top + _height).toString());
                diffAndSetAttribute(bottomLine, "x2", (_left + _width).toString());
                diffAndSetAttribute(bottomLine, "y2", (_top + _height).toString());
                diffAndSetAttribute(bottomLine, "stroke", "lime");
                diffAndSetAttribute(bottomLine, "stroke-width", "6");
                this.centerSVG.appendChild(bottomLine);
            }
            else {
                var bg = document.createElementNS(Avionics.SVG.NS, "rect");
                diffAndSetAttribute(bg, "x", _left.toString());
                diffAndSetAttribute(bg, "y", _top.toString());
                diffAndSetAttribute(bg, "width", _width.toString());
                diffAndSetAttribute(bg, "height", _height.toString());
                diffAndSetAttribute(bg, "fill", "black");
                diffAndSetAttribute(bg, "fill-opacity", "0.3");
                this.centerSVG.appendChild(bg);
            }
            this.graduationScrollPosX = _left;
            this.graduationScrollPosY = _top + _height * 0.5;
            for (var i = 0; i < this.totalGraduations; i++) {
                var line = new Avionics.SVGGraduation();
                line.IsPrimary = true;
                if (this.nbSecondaryGraduations > 0 && (i % (this.nbSecondaryGraduations + 1)))
                    line.IsPrimary = false;
                var lineWidth = (line.IsPrimary) ? 22 : 22;
                var lineHeight = (line.IsPrimary) ? 3 : 3;
                line.SVGLine = document.createElementNS(Avionics.SVG.NS, "rect");
                line.SVGLine.setAttribute("x", "0");
                line.SVGLine.setAttribute("width", lineWidth.toString());
                line.SVGLine.setAttribute("height", lineHeight.toString());
                line.SVGLine.setAttribute("fill", (this.isHud) ? "lime" : "white");
                this.centerSVG.appendChild(line.SVGLine);
                if (line.IsPrimary) {
                    var xPos = lineWidth + 40;
                    line.SVGText1 = document.createElementNS(Avionics.SVG.NS, "text");
                    line.SVGText1.setAttribute("x", xPos.toString());
                    line.SVGText1.setAttribute("y", "10");
                    line.SVGText1.setAttribute("fill", (this.isHud) ? "lime" : "white");
                    line.SVGText1.setAttribute("font-size", (this.fontSize * 1.15).toString());
                    line.SVGText1.setAttribute("font-family", "Roboto-Bold");
                    line.SVGText1.setAttribute("text-anchor", "end");
                    line.SVGText1.setAttribute("alignment-baseline", "bottom");
                    this.centerSVG.appendChild(line.SVGText1);
                    line.SVGText2 = document.createElementNS(Avionics.SVG.NS, "text");
                    line.SVGText2.setAttribute("x", xPos.toString());
                    line.SVGText2.setAttribute("y", "10");
                    line.SVGText2.setAttribute("fill", (this.isHud) ? "lime" : "white");
                    line.SVGText2.setAttribute("font-size", (this.fontSize * 0.85).toString());
                    line.SVGText2.setAttribute("font-family", "Roboto-Bold");
                    line.SVGText2.setAttribute("text-anchor", "start");
                    line.SVGText2.setAttribute("alignment-baseline", "bottom");
                    this.centerSVG.appendChild(line.SVGText2);
                }
                this.graduations.push(line);
            }
            this.groundRibbonHasFixedHeight = true;
            var groundRibbonPosX = _left;
            var groundRibbonPosY = 0;
            var groundRibbonWidth = _width;
            var groundRibbonHeight = 40;
            if (!this.groundRibbonSVG) {
                this.groundRibbonSVG = document.createElementNS(Avionics.SVG.NS, "svg");
                this.groundRibbonSVG.setAttribute("id", "GroundRibbonGroup");
            }
            else
                Utils.RemoveAllChildren(this.groundRibbonSVG);
            this.groundRibbonSVG.setAttribute("x", groundRibbonPosX.toString());
            this.groundRibbonSVG.setAttribute("y", groundRibbonPosY.toString());
            this.groundRibbonSVG.setAttribute("width", groundRibbonWidth.toString());
            this.groundRibbonSVG.setAttribute("height", groundRibbonHeight.toString());
            this.groundRibbonSVG.setAttribute("viewBox", "0 0 " + groundRibbonWidth + " " + groundRibbonHeight);
            {
                var dashHeight = 5;
                var dashEndPos = _height;
                var dashPos = -100;
                while (dashPos < (dashEndPos - dashHeight * 2)) {
                    let dashLine = document.createElementNS(Avionics.SVG.NS, "rect");
                    diffAndSetAttribute(dashLine, "x", "0");
                    diffAndSetAttribute(dashLine, "y", dashPos.toString());
                    diffAndSetAttribute(dashLine, "width", groundRibbonWidth.toString());
                    diffAndSetAttribute(dashLine, "height", dashHeight.toString());
                    diffAndSetAttribute(dashLine, "transform", "skewY(45)");
                    diffAndSetAttribute(dashLine, "fill", (this.isHud) ? "lime" : "orange");
                    this.groundRibbonSVG.appendChild(dashLine);
                    dashPos += dashHeight * 2;
                }
                if (!this.groundRibbonSVGShape)
                    this.groundRibbonSVGShape = document.createElementNS(Avionics.SVG.NS, "rect");
                this.groundRibbonSVGShape.setAttribute("fill", (this.isHud) ? "lime" : "orange");
                this.groundRibbonSVGShape.setAttribute("stroke", (this.isHud) ? "lime" : "orange");
                this.groundRibbonSVGShape.setAttribute("stroke-width", "2");
                this.groundRibbonSVGShape.setAttribute("width", groundRibbonWidth.toString());
                this.groundRibbonSVGShape.setAttribute("height", "5");
                this.groundRibbonSVGShape.setAttribute("x", "0");
                this.groundRibbonSVG.appendChild(this.groundRibbonSVGShape);
            }
            this.centerSVG.appendChild(this.groundRibbonSVG);
            let singleLineHeight = 500 * this.graduationSpacing * (this.nbSecondaryGraduations + 1) / this.graduationScroller.increment;
            let groundStripPosX = _left - 6;
            let groundStripPosY = 0;
            let groundStripWidth = width;
            this.groundLineSVGHeight = singleLineHeight * 2;
            if (!this.groundLineSVG) {
                this.groundLineSVG = document.createElementNS(Avionics.SVG.NS, "svg");
                this.groundLineSVG.setAttribute("id", "GroundLineGroup");
            }
            else
                Utils.RemoveAllChildren(this.groundLineSVG);
            this.groundLineSVG.setAttribute("x", groundStripPosX.toString());
            this.groundLineSVG.setAttribute("y", groundStripPosY.toString());
            this.groundLineSVG.setAttribute("width", groundStripWidth.toString());
            this.groundLineSVG.setAttribute("height", this.groundLineSVGHeight.toString());
            this.groundLineSVG.setAttribute("viewBox", "0 0 " + groundStripWidth + " " + this.groundLineSVGHeight);
            {
                let whiteLine = document.createElementNS(Avionics.SVG.NS, "rect");
                diffAndSetAttribute(whiteLine, "fill", (this.isHud) ? "lime" : "white");
                diffAndSetAttribute(whiteLine, "x", "0");
                diffAndSetAttribute(whiteLine, "y", "0");
                diffAndSetAttribute(whiteLine, "width", "6");
                diffAndSetAttribute(whiteLine, "height", singleLineHeight.toString());
                this.groundLineSVG.appendChild(whiteLine);
                let amberLine = document.createElementNS(Avionics.SVG.NS, "rect");
                diffAndSetAttribute(amberLine, "fill", (this.isHud) ? "lime" : "orange");
                diffAndSetAttribute(amberLine, "x", "0");
                diffAndSetAttribute(amberLine, "y", singleLineHeight.toString());
                diffAndSetAttribute(amberLine, "width", "6");
                diffAndSetAttribute(amberLine, "height", singleLineHeight.toString());
                this.groundLineSVG.appendChild(amberLine);
            }
            this.centerSVG.appendChild(this.groundLineSVG);
            this.thousandIndicator = document.createElementNS(Avionics.SVG.NS, "g");
            this.thousandIndicator.setAttribute("id", "thousandGroup");
            {
                let topLine = document.createElementNS(Avionics.SVG.NS, "line");
                diffAndSetAttribute(topLine, "x1", (_left + 5).toString());
                diffAndSetAttribute(topLine, "y1", "-18");
                diffAndSetAttribute(topLine, "x2", _width.toString());
                diffAndSetAttribute(topLine, "y2", "-18");
                diffAndSetAttribute(topLine, "stroke", (this.isHud) ? "lime" : "white");
                diffAndSetAttribute(topLine, "stroke-width", "3");
                this.thousandIndicator.appendChild(topLine);
                let bottomLine = document.createElementNS(Avionics.SVG.NS, "line");
                diffAndSetAttribute(bottomLine, "x1", (_left + 5).toString());
                diffAndSetAttribute(bottomLine, "y1", "18");
                diffAndSetAttribute(bottomLine, "x2", _width.toString());
                diffAndSetAttribute(bottomLine, "y2", "18");
                diffAndSetAttribute(bottomLine, "stroke", (this.isHud) ? "lime" : "white");
                diffAndSetAttribute(bottomLine, "stroke-width", "3");
                this.thousandIndicator.appendChild(bottomLine);
            }
            this.centerSVG.appendChild(this.thousandIndicator);
            var targetAltitudeIndicatorWidth = 100;
            var targetAltitudeIndicatorHeight = 100;
            var targetAltitudeIndicatorPosX = 0;
            if (!this.targetAltitudeIndicatorSVG) {
                this.targetAltitudeIndicatorSVG = document.createElementNS(Avionics.SVG.NS, "svg");
                this.targetAltitudeIndicatorSVG.setAttribute("id", "TargetAltitudeIndicator");
            }
            else
                Utils.RemoveAllChildren(this.targetAltitudeIndicatorSVG);
            this.targetAltitudeIndicatorSVG.setAttribute("x", targetAltitudeIndicatorPosX.toString());
            this.targetAltitudeIndicatorSVG.setAttribute("width", targetAltitudeIndicatorWidth.toString());
            this.targetAltitudeIndicatorSVG.setAttribute("height", targetAltitudeIndicatorHeight.toString());
            this.targetAltitudeIndicatorSVG.setAttribute("viewBox", "0 0 100 100");
            {
                if (!this.targetAltitudeIndicatorSVGShape)
                    this.targetAltitudeIndicatorSVGShape = document.createElementNS(Avionics.SVG.NS, "path");
                this.targetAltitudeIndicatorSVGShape.setAttribute("fill", "none");
                this.targetAltitudeIndicatorSVGShape.setAttribute("stroke", (this.isHud) ? "lime" : "#D570FF");
                this.targetAltitudeIndicatorSVGShape.setAttribute("stroke-width", "2");
                this.targetAltitudeIndicatorSVGShape.setAttribute("d", "M 10 20 L 55 20 L 55 80 L 10 80 L 10 60 L 18 50 L 10 40 Z");
                this.targetAltitudeIndicatorSVG.appendChild(this.targetAltitudeIndicatorSVGShape);
            }
            this.centerSVG.appendChild(this.targetAltitudeIndicatorSVG);
            var cursorPosX = _left + 15;
            var cursorPosY = _top + _height * 0.5 + 2;
            var cursorWidth = width + arcWidth;
            var cursorHeight = 80;
            if (!this.cursorSVG) {
                this.cursorSVG = document.createElementNS(Avionics.SVG.NS, "svg");
                this.cursorSVG.setAttribute("id", "CursorGroup");
            }
            else
                Utils.RemoveAllChildren(this.cursorSVG);
            this.cursorSVG.setAttribute("x", cursorPosX.toString());
            this.cursorSVG.setAttribute("y", (cursorPosY - cursorHeight * 0.5).toString());
            this.cursorSVG.setAttribute("width", cursorWidth.toString());
            this.cursorSVG.setAttribute("height", cursorHeight.toString());
            this.cursorSVG.setAttribute("viewBox", "0 0 " + cursorWidth + " " + cursorHeight);
            {
                var _cursorPosX = 21;
                var _cursorPosY = cursorHeight * 0.5;
                if (!this.cursorSVGShape)
                    this.cursorSVGShape = document.createElementNS(Avionics.SVG.NS, "path");
                this.cursorSVGShape.setAttribute("fill", "black");
                this.cursorSVGShape.setAttribute("d", "M 15 0 L 130 0 L 130 80 L 15 80 L 15 53 L 0 40 L 15 27 Z");
                this.cursorSVGShape.setAttribute("stroke", (this.isHud) ? "lime" : "white");
                this.cursorSVGShape.setAttribute("stroke-width", this.strokeSize);
                this.cursorSVG.appendChild(this.cursorSVGShape);
                this.cursorIntegrals[0].construct(this.cursorSVG, _cursorPosX + 19, _cursorPosY, _width, "Roboto-Bold", this.fontSize * 1.6, (this.isHud) ? "lime" : "white");
                this.cursorIntegrals[1].construct(this.cursorSVG, _cursorPosX + 44, _cursorPosY, _width, "Roboto-Bold", this.fontSize * 1.6, (this.isHud) ? "lime" : "white");
                this.cursorIntegrals[2].construct(this.cursorSVG, _cursorPosX + 69, _cursorPosY, _width, "Roboto-Bold", this.fontSize * 1.6, (this.isHud) ? "lime" : "white");
                this.cursorDecimals.construct(this.cursorSVG, _cursorPosX + 104, _cursorPosY, _width, "Roboto-Bold", this.fontSize * 1.15, (this.isHud) ? "lime" : "white");
                if (!this.cursorSVGAltitudeLevelShape)
                    this.cursorSVGAltitudeLevelShape = document.createElementNS(Avionics.SVG.NS, "rect");
                this.cursorSVGAltitudeLevelShape.setAttribute("fill", (this.isHud) ? "lime" : "#24F000");
                this.cursorSVGAltitudeLevelShape.setAttribute("x", "18");
                this.cursorSVGAltitudeLevelShape.setAttribute("y", ((cursorHeight * 0.62) * 0.5).toString());
                this.cursorSVGAltitudeLevelShape.setAttribute("width", "20");
                this.cursorSVGAltitudeLevelShape.setAttribute("height", (cursorHeight * 0.4).toString());
                this.cursorSVG.appendChild(this.cursorSVGAltitudeLevelShape);
            }
            this.centerSVG.appendChild(this.cursorSVG);
        }
        this.rootGroup.appendChild(this.centerSVG);
        let mtrsGroup = document.createElementNS(Avionics.SVG.NS, "g");
        diffAndSetAttribute(mtrsGroup, "id", "MetersGroup");
        {
            this.mtrsSelectedGroup = document.createElementNS(Avionics.SVG.NS, "g");
            this.mtrsSelectedGroup.setAttribute("id", "SelectedGroup");
            {
                if (!this.isHud) {
                    let bg = document.createElementNS(Avionics.SVG.NS, "rect");
                    diffAndSetAttribute(bg, "x", "67");
                    diffAndSetAttribute(bg, "y", "0");
                    diffAndSetAttribute(bg, "width", "105");
                    diffAndSetAttribute(bg, "height", "30");
                    diffAndSetAttribute(bg, "fill", "black");
                    diffAndSetAttribute(bg, "fill-opacity", "0.5");
                    this.mtrsSelectedGroup.appendChild(bg);
                }
                this.mtrsSelectedSVGText = document.createElementNS(Avionics.SVG.NS, "text");
                this.mtrsSelectedSVGText.setAttribute("x", "158");
                this.mtrsSelectedSVGText.setAttribute("y", "25");
                this.mtrsSelectedSVGText.setAttribute("fill", (this.isHud) ? "lime" : "#D570FF");
                this.mtrsSelectedSVGText.setAttribute("font-size", (this.fontSize * 1.2).toString());
                this.mtrsSelectedSVGText.setAttribute("font-family", "Roboto-Bold");
                this.mtrsSelectedSVGText.setAttribute("text-anchor", "end");
                this.mtrsSelectedSVGText.setAttribute("alignment-baseline", "bottom");
                this.mtrsSelectedGroup.appendChild(this.mtrsSelectedSVGText);
                var mtrsSelectedSVGUnit = document.createElementNS(Avionics.SVG.NS, "text");
                diffAndSetText(mtrsSelectedSVGUnit, "M");
                diffAndSetAttribute(mtrsSelectedSVGUnit, "x", "158");
                diffAndSetAttribute(mtrsSelectedSVGUnit, "y", "25");
                diffAndSetAttribute(mtrsSelectedSVGUnit, "fill", (this.isHud) ? "lime" : "cyan");
                diffAndSetAttribute(mtrsSelectedSVGUnit, "font-size", (this.fontSize * 0.9).toString());
                diffAndSetAttribute(mtrsSelectedSVGUnit, "font-family", "Roboto-Bold");
                diffAndSetAttribute(mtrsSelectedSVGUnit, "text-anchor", "start");
                diffAndSetAttribute(mtrsSelectedSVGUnit, "alignment-baseline", "bottom");
                this.mtrsSelectedGroup.appendChild(mtrsSelectedSVGUnit);
            }
            mtrsGroup.appendChild(this.mtrsSelectedGroup);
            var mtrsCursorPosX = _left + 62.5;
            var mtrsCursorPosY = _top + _height * 0.578;
            var mtrsCursorWidth = width + arcWidth;
            var mtrsCursorHeight = 36;
            this.mtrsCursorGroup = document.createElementNS(Avionics.SVG.NS, "svg");
            this.mtrsCursorGroup.setAttribute("id", "MetersCursorGroup");
            this.mtrsCursorGroup.setAttribute("x", mtrsCursorPosX.toString());
            this.mtrsCursorGroup.setAttribute("y", (mtrsCursorPosY - mtrsCursorHeight * 0.5).toString());
            this.mtrsCursorGroup.setAttribute("width", mtrsCursorWidth.toString());
            this.mtrsCursorGroup.setAttribute("height", mtrsCursorHeight.toString());
            this.mtrsCursorGroup.setAttribute("viewBox", "0 0 " + mtrsCursorWidth + " " + mtrsCursorHeight);
            {
                var mtrsCursorSVGShape = document.createElementNS(Avionics.SVG.NS, "path");
                diffAndSetAttribute(mtrsCursorSVGShape, "fill", "black");
                diffAndSetAttribute(mtrsCursorSVGShape, "d", "M 15 0 L 130 0 L 130 36 L 15 36 Z");
                diffAndSetAttribute(mtrsCursorSVGShape, "stroke", (this.isHud) ? "lime" : "white");
                diffAndSetAttribute(mtrsCursorSVGShape, "stroke-width", this.strokeSize);
                this.mtrsCursorGroup.appendChild(mtrsCursorSVGShape);
                this.mtrsCursorSVGText = document.createElementNS(Avionics.SVG.NS, "text");
                this.mtrsCursorSVGText.setAttribute("x", "110");
                this.mtrsCursorSVGText.setAttribute("y", (mtrsCursorHeight * 0.84).toString());
                this.mtrsCursorSVGText.setAttribute("fill", (this.isHud) ? "lime" : "white");
                this.mtrsCursorSVGText.setAttribute("font-size", (this.fontSize * 1.2).toString());
                this.mtrsCursorSVGText.setAttribute("font-family", "Roboto-Bold");
                this.mtrsCursorSVGText.setAttribute("text-anchor", "end");
                this.mtrsCursorSVGText.setAttribute("alignment-baseline", "bottom");
                this.mtrsCursorGroup.appendChild(this.mtrsCursorSVGText);
                let mtrsCursorSVGUnit = document.createElementNS(Avionics.SVG.NS, "text");
                diffAndSetText(mtrsCursorSVGUnit, "M");
                diffAndSetAttribute(mtrsCursorSVGUnit, "x", "110");
                diffAndSetAttribute(mtrsCursorSVGUnit, "y", (mtrsCursorHeight * 0.84).toString());
                diffAndSetAttribute(mtrsCursorSVGUnit, "fill", (this.isHud) ? "lime" : "cyan");
                diffAndSetAttribute(mtrsCursorSVGUnit, "font-size", (this.fontSize * 0.9).toString());
                diffAndSetAttribute(mtrsCursorSVGUnit, "font-family", "Roboto-Bold");
                diffAndSetAttribute(mtrsCursorSVGUnit, "text-anchor", "start");
                diffAndSetAttribute(mtrsCursorSVGUnit, "alignment-baseline", "bottom");
                this.mtrsCursorGroup.appendChild(mtrsCursorSVGUnit);
            }
            mtrsGroup.appendChild(this.mtrsCursorGroup);
        }
        this.rootGroup.appendChild(mtrsGroup);
        if (!this.pressureSVG)
            this.pressureSVG = document.createElementNS(Avionics.SVG.NS, "text");
        this.pressureSVG.textContent = "---";
        this.pressureSVG.setAttribute("x", "130");
        this.pressureSVG.setAttribute("y", (posY + height + sideTextHeight * 0.5 - 5).toString());
        this.pressureSVG.setAttribute("fill", (this.isHud) ? "lime" : "#24F000");
        this.pressureSVG.setAttribute("font-size", (this.fontSize * 1.15).toString());
        this.pressureSVG.setAttribute("font-family", "Roboto-Bold");
        this.pressureSVG.setAttribute("text-anchor", "middle");
        this.pressureSVG.setAttribute("alignment-baseline", "central");
        this.pressureSVG.setAttribute("letter-spacing", "-3px");
        this.rootGroup.appendChild(this.pressureSVG);
        this.rootSVG.appendChild(this.rootGroup);
        this.appendChild(this.rootSVG);
    }
    construct_A320_Neo() {
        Utils.RemoveAllChildren(this);
        this.rootSVG = document.createElementNS(Avionics.SVG.NS, "svg");
        this.rootSVG.setAttribute("id", "ViewBox");
        this.rootSVG.setAttribute("viewBox", "0 0 250 750");
        var posX = 75;
        var posY = 25;
        var width = 75;
        var height = 480;
        var arcWidth = 40;
        this.refHeight = height;
        this.borderSize = 5;
        this.graduationScroller = new Avionics.Scroller(this.nbPrimaryGraduations, 500, true);
        this.cursorIntegrals = new Array();
        this.cursorIntegrals.push(new Avionics.AltitudeScroller(3, 75, 1, 10, 1000));
        this.cursorIntegrals.push(new Avionics.AltitudeScroller(3, 75, 1, 10, 100));
        this.cursorIntegrals.push(new Avionics.AltitudeScroller(3, 75, 1, 10, 10));
        this.cursorDecimals = new Avionics.AltitudeScroller(5, 25, 20, 100);
        if (!this.rootGroup) {
            this.rootGroup = document.createElementNS(Avionics.SVG.NS, "g");
            this.rootGroup.setAttribute("id", "Altimeter");
        }
        else {
            Utils.RemoveAllChildren(this.rootGroup);
        }
        if (!this.centerSVG) {
            this.centerSVG = document.createElementNS(Avionics.SVG.NS, "svg");
            this.centerSVG.setAttribute("id", "CenterGroup");
        }
        else
            Utils.RemoveAllChildren(this.centerSVG);
        this.centerSVG.setAttribute("x", (posX - width * 0.5).toString());
        this.centerSVG.setAttribute("y", posY.toString());
        this.centerSVG.setAttribute("width", (25 + width + arcWidth).toString());
        this.centerSVG.setAttribute("height", height.toString());
        this.centerSVG.setAttribute("viewBox", "0 0 " + (25 + width + arcWidth) + " " + height);
        {
            var _top = 0;
            var _left = 25;
            var _width = width;
            var _height = height;
            var bg = document.createElementNS(Avionics.SVG.NS, "rect");
            diffAndSetAttribute(bg, "x", _left.toString());
            diffAndSetAttribute(bg, "y", _top.toString());
            diffAndSetAttribute(bg, "width", _width.toString());
            diffAndSetAttribute(bg, "height", _height.toString());
            diffAndSetAttribute(bg, "fill", "#343B51");
            this.centerSVG.appendChild(bg);
            var topLine = document.createElementNS(Avionics.SVG.NS, "line");
            diffAndSetAttribute(topLine, "x1", _left.toString());
            diffAndSetAttribute(topLine, "y1", (_top + 2).toString());
            diffAndSetAttribute(topLine, "x2", (_left + _width + arcWidth).toString());
            diffAndSetAttribute(topLine, "y2", (_top + 2).toString());
            diffAndSetAttribute(topLine, "stroke", "white");
            diffAndSetAttribute(topLine, "stroke-width", "4");
            this.centerSVG.appendChild(topLine);
            var bottomLine = document.createElementNS(Avionics.SVG.NS, "line");
            diffAndSetAttribute(bottomLine, "x1", _left.toString());
            diffAndSetAttribute(bottomLine, "y1", (_top + _height - 2).toString());
            diffAndSetAttribute(bottomLine, "x2", (_left + _width + arcWidth).toString());
            diffAndSetAttribute(bottomLine, "y2", (_top + _height - 2).toString());
            diffAndSetAttribute(bottomLine, "stroke", "white");
            diffAndSetAttribute(bottomLine, "stroke-width", "4");
            this.centerSVG.appendChild(bottomLine);
            this.graduationScrollPosX = 0;
            this.graduationScrollPosY = _top + _height * 0.5;
            for (var i = 0; i < this.totalGraduations; i++) {
                var line = new Avionics.SVGGraduation();
                line.IsPrimary = true;
                if (this.nbSecondaryGraduations > 0 && (i % (this.nbSecondaryGraduations + 1)))
                    line.IsPrimary = false;
                var lineWidth = (line.IsPrimary) ? 9 : 9;
                var lineHeight = (line.IsPrimary) ? 4 : 4;
                line.SVGLine = document.createElementNS(Avionics.SVG.NS, "rect");
                line.SVGLine.setAttribute("x", (_left + _width - lineWidth).toString());
                line.SVGLine.setAttribute("width", lineWidth.toString());
                line.SVGLine.setAttribute("height", lineHeight.toString());
                line.SVGLine.setAttribute("fill", "white");
                if (line.IsPrimary) {
                    line.SVGText1 = document.createElementNS(Avionics.SVG.NS, "text");
                    line.SVGText1.setAttribute("x", (_left + _width - lineWidth - 3).toString());
                    line.SVGText1.setAttribute("fill", "white");
                    line.SVGText1.setAttribute("font-size", (this.fontSize * 1.4).toString());
                    line.SVGText1.setAttribute("font-family", "Roboto-Bold");
                    line.SVGText1.setAttribute("text-anchor", "end");
                    line.SVGText1.setAttribute("alignment-baseline", "central");
                }
                this.graduations.push(line);
            }
            for (var i = 0; i < this.totalGraduations; i++) {
                var line = this.graduations[i];
                this.centerSVG.appendChild(line.SVGLine);
                if (line.SVGText1) {
                    this.centerSVG.appendChild(line.SVGText1);
                }
            }
            var groundRibbonPosX = _left + _width;
            var groundRibbonPosY = 0;
            var groundRibbonWidth = 100;
            var groundRibbonHeight = _height;
            if (!this.groundRibbonSVG) {
                this.groundRibbonSVG = document.createElementNS(Avionics.SVG.NS, "svg");
                this.groundRibbonSVG.setAttribute("id", "GroundRibbonGroup");
            }
            else
                Utils.RemoveAllChildren(this.groundRibbonSVG);
            this.groundRibbonSVG.setAttribute("x", groundRibbonPosX.toString());
            this.groundRibbonSVG.setAttribute("y", groundRibbonPosY.toString());
            this.groundRibbonSVG.setAttribute("width", groundRibbonWidth.toString());
            this.groundRibbonSVG.setAttribute("height", groundRibbonHeight.toString());
            this.groundRibbonSVG.setAttribute("viewBox", "0 0 " + groundRibbonWidth + " " + groundRibbonHeight);
            {
                if (!this.groundRibbonSVGShape)
                    this.groundRibbonSVGShape = document.createElementNS(Avionics.SVG.NS, "rect");
                this.groundRibbonSVGShape.setAttribute("fill", "red");
                this.groundRibbonSVGShape.setAttribute("stroke", "red");
                this.groundRibbonSVGShape.setAttribute("stroke-width", "2");
                this.groundRibbonSVGShape.setAttribute("width", "12");
                this.groundRibbonSVGShape.setAttribute("x", "2");
                this.groundRibbonSVG.appendChild(this.groundRibbonSVGShape);
            }
            this.centerSVG.appendChild(this.groundRibbonSVG);
            var targetAltitudeIndicatorWidth = 100;
            var targetAltitudeIndicatorHeight = 150;
            var targetAltitudeIndicatorPosX = _left - 9;
            if (!this.targetAltitudeIndicatorSVG) {
                this.targetAltitudeIndicatorSVG = document.createElementNS(Avionics.SVG.NS, "svg");
                this.targetAltitudeIndicatorSVG.setAttribute("id", "TargetAltitudeIndicator");
            }
            else
                Utils.RemoveAllChildren(this.targetAltitudeIndicatorSVG);
            this.targetAltitudeIndicatorSVG.setAttribute("x", targetAltitudeIndicatorPosX.toString());
            this.targetAltitudeIndicatorSVG.setAttribute("width", targetAltitudeIndicatorWidth.toString());
            this.targetAltitudeIndicatorSVG.setAttribute("height", targetAltitudeIndicatorHeight.toString());
            this.targetAltitudeIndicatorSVG.setAttribute("viewBox", "0 0 100 150");
            {
                if (!this.targetAltitudeIndicatorSVGShape)
                    this.targetAltitudeIndicatorSVGShape = document.createElementNS(Avionics.SVG.NS, "path");
                this.targetAltitudeIndicatorSVGShape.setAttribute("fill", "none");
                this.targetAltitudeIndicatorSVGShape.setAttribute("stroke", "cyan");
                this.targetAltitudeIndicatorSVGShape.setAttribute("stroke-width", "2");
                this.targetAltitudeIndicatorSVGShape.setAttribute("d", "M 0 0 L 35 0 L 35 100 L 0 100 L 0 55 L 6 50 L 0 45 Z");
                this.targetAltitudeIndicatorSVG.appendChild(this.targetAltitudeIndicatorSVGShape);
                let textBg = document.createElementNS(Avionics.SVG.NS, "rect");
                diffAndSetAttribute(textBg, "x", "8");
                diffAndSetAttribute(textBg, "y", "35");
                diffAndSetAttribute(textBg, "width", (_width + 2).toString());
                diffAndSetAttribute(textBg, "height", "30");
                diffAndSetAttribute(textBg, "fill", "black");
                this.targetAltitudeIndicatorSVG.appendChild(textBg);
                this.targetAltitudeIndicatorSVGText = document.createElementNS(Avionics.SVG.NS, "text");
                this.targetAltitudeIndicatorSVGText.textContent = "35000";
                this.targetAltitudeIndicatorSVGText.setAttribute("x", (8 + _width + 18).toString());
                this.targetAltitudeIndicatorSVGText.setAttribute("y", "49");
                this.targetAltitudeIndicatorSVGText.setAttribute("fill", "cyan");
                this.targetAltitudeIndicatorSVGText.setAttribute("font-size", (this.fontSize * 1.15).toString());
                this.targetAltitudeIndicatorSVGText.setAttribute("font-family", "Roboto-Bold");
                this.targetAltitudeIndicatorSVGText.setAttribute("text-anchor", "end");
                this.targetAltitudeIndicatorSVGText.setAttribute("alignment-baseline", "central");
                this.targetAltitudeIndicatorSVG.appendChild(this.targetAltitudeIndicatorSVGText);
            }
            this.centerSVG.appendChild(this.targetAltitudeIndicatorSVG);
            var cursorPosX = _left - 2;
            var cursorPosY = _top + _height * 0.5;
            var cursorWidth = width + arcWidth;
            var cursorHeight = 80;
            if (!this.cursorSVG) {
                this.cursorSVG = document.createElementNS(Avionics.SVG.NS, "svg");
                this.cursorSVG.setAttribute("id", "CursorGroup");
            }
            else
                Utils.RemoveAllChildren(this.cursorSVG);
            this.cursorSVG.setAttribute("x", cursorPosX.toString());
            this.cursorSVG.setAttribute("y", (cursorPosY - cursorHeight * 0.5).toString());
            this.cursorSVG.setAttribute("width", cursorWidth.toString());
            this.cursorSVG.setAttribute("height", cursorHeight.toString());
            this.cursorSVG.setAttribute("viewBox", "0 0 " + cursorWidth + " " + cursorHeight);
            {
                var _cursorPosX = 5;
                var _cursorPosY = cursorHeight * 0.5 - 2;
                if (!this.cursorSVGShape)
                    this.cursorSVGShape = document.createElementNS(Avionics.SVG.NS, "path");
                this.cursorSVGShape.setAttribute("fill", "black");
                this.cursorSVGShape.setAttribute("d", "M 0 17.5 L 77 17.5 L 77 0 L 115 0 L 115 80 L 77 80 L 77 62.5 L 0 62.5 Z");
                this.cursorSVGShape.setAttribute("stroke", "white");
                this.cursorSVGShape.setAttribute("stroke-width", this.strokeSize);
                this.cursorSVG.appendChild(this.cursorSVGShape);
                let integralsGroup = document.createElementNS(Avionics.SVG.NS, "svg");
                diffAndSetAttribute(integralsGroup, "x", "0");
                diffAndSetAttribute(integralsGroup, "y", "20");
                diffAndSetAttribute(integralsGroup, "width", cursorWidth.toString());
                diffAndSetAttribute(integralsGroup, "height", (cursorHeight - 40).toString());
                diffAndSetAttribute(integralsGroup, "viewBox", "0 0 " + cursorWidth + " " + cursorHeight);
                this.cursorSVG.appendChild(integralsGroup);
                {
                    this.cursorIntegrals[0].construct(integralsGroup, _cursorPosX - 5, _cursorPosY, _width, "Roboto-Bold", this.fontSize * 3.35, "rgb(36,255,0)");
                    this.cursorIntegrals[1].construct(integralsGroup, _cursorPosX + 43, _cursorPosY, _width, "Roboto-Bold", this.fontSize * 3.35, "rgb(36,255,0)");
                    this.cursorIntegrals[2].construct(integralsGroup, _cursorPosX + 91, _cursorPosY, _width, "Roboto-Bold", this.fontSize * 3.35, "rgb(36,255,0)");
                }
                this.cursorDecimals.construct(this.cursorSVG, _cursorPosX + 109, _cursorPosY, _width, "Roboto-Bold", this.fontSize * 1.15, "rgb(36,255,0)");
            }
            this.centerSVG.appendChild(this.cursorSVG);
            if (!this.targetAltitudeText) {
                this.targetAltitudeText = document.createElement("div");
                this.targetAltitudeText.id = "TargetAltitudeText";
            }
            else {
                Utils.RemoveAllChildren(this.targetAltitudeText);
            }
            this.targetAltitudeText.style.fontSize = "45px";
            this.targetAltitudeText.style.color = "cyan";
            this.targetAltitudeText.style.position = "absolute";
            this.targetAltitudeText.style.top = "-20px";
            this.targetAltitudeText.style.left = "115px";
            this.appendChild(this.targetAltitudeText);
        }
        this.rootGroup.appendChild(this.centerSVG);
        if (!this.pressureSVG)
            this.pressureSVG = document.createElementNS(Avionics.SVG.NS, "text");
        this.pressureSVG.textContent = "---";
        this.pressureSVG.setAttribute("x", "70");
        this.pressureSVG.setAttribute("y", (posY + height + 90).toString());
        this.pressureSVG.setAttribute("fill", "cyan");
        this.pressureSVG.setAttribute("font-size", (this.fontSize * 1.05).toString());
        this.pressureSVG.setAttribute("font-family", "Roboto-Light");
        this.pressureSVG.setAttribute("text-anchor", "start");
        this.pressureSVG.setAttribute("alignment-baseline", "central");
        this.pressureSVG.setAttribute("letter-spacing", "-3px");
        this.rootGroup.appendChild(this.pressureSVG);
        this.rootSVG.appendChild(this.rootGroup);
        this.appendChild(this.rootSVG);
    }
    update(_dTime) {
        let indicatedAltitude = Simplane.getAltitude();
        let aboveGroundAltitude = Simplane.getAltitudeAboveGround();
        var groundReference = indicatedAltitude - aboveGroundAltitude;
        var baroMode = Simplane.getPressureSelectedMode(this.aircraft);
        var selectedAltitude;
        let minMode = SimVar.GetSimVarValue("L:WT_CJ4_MIN_SRC", "Number");
        if (this.aircraft === Aircraft.AS01B || this.aircraft === Aircraft.B747_8 || this.aircraft === Aircraft.A320_NEO) {
            selectedAltitude = Math.max(0, Simplane.getAutoPilotDisplayedAltitudeLockValue());
        }
        else {
            //selectedAltitude = Math.max(0, Simplane.getAutoPilotAltitudeLockValue());
            selectedAltitude = Math.min(Math.max(0, SimVar.GetSimVarValue("AUTOPILOT ALTITUDE LOCK VAR:1", "feet")), 45000);
        }
        this.updateGraduationScrolling(indicatedAltitude);
        this.updateCursorScrolling(indicatedAltitude);
        this.updateGroundReference(indicatedAltitude, groundReference);
        this.updateTargetAltitude(indicatedAltitude, selectedAltitude, baroMode);
        this.updateBaroPressure(baroMode);
        this.updateBaroMinimums(minMode, indicatedAltitude);
        this.updateRadioMinimums(minMode, aboveGroundAltitude, indicatedAltitude, groundReference);
        this.updateMtrs(indicatedAltitude, selectedAltitude);
        this.updateAltitudeAlertFlash(_dTime);
    }
    updateMtrs(_altitude, _selected) {
        if (this.mtrsVisible) {
            if (this.mtrsSelectedGroup) {
                var APMode = this.getAutopilotMode();
                if (APMode != AutopilotMode.MANAGED) {
                    let meters = Math.round(_selected * 0.3048);
                    this.mtrsSelectedSVGText.textContent = meters.toString();
                    this.mtrsSelectedGroup.setAttribute("visibility", "visible");
                }
                else {
                    this.mtrsSelectedGroup.setAttribute("visibility", "hidden");
                }
            }
            if (this.mtrsCursorGroup) {
                let meters = Math.round(_altitude * 0.3048);
                this.mtrsCursorSVGText.textContent = meters.toString();
                this.mtrsCursorGroup.setAttribute("visibility", "visible");
            }
        }
        else {
            if (this.mtrsSelectedGroup)
                this.mtrsSelectedGroup.setAttribute("visibility", "hidden");
            if (this.mtrsCursorGroup)
                this.mtrsCursorGroup.setAttribute("visibility", "hidden");
        }
    }
    updateBaroPressure(_mode) {
        let baroPreset = SimVar.GetSimVarValue("L:XMLVAR_Baro1_SavedPressure", "number") / 16;
        
        if (this.pressureSVGLeftPart && this.pressureSVGCenterPart && this.pressureSVGRightPart) {
            var units = Simplane.getPressureSelectedUnits();
            var pressure = Simplane.getPressureValue(units);

            if (_mode == "STD") {
                if (this._baroPresetChanged !== baroPreset && this._baroPresetChanged !== 0) {
                    this.pressureBoxGroup.setAttribute("visibility", "visible");
                    this._baroPresetChanged = baroPreset;
                }
                if (units == "millibar") {
                    this.pressureSVGLeftPart.textContent = "1013";
                    this.pressureSVGCenterPart.textContent = "";
                    this.pressureSVGRightPart.textContent = "";
                    this.pressureSVGUnits.textContent = "STD";
                    this.pressurePresetLeftPart.textContent = baroPreset.toFixed(0);
                    this.pressurePresetCenterPart.textContent = "";
                    this.pressurePresetRightPart.textContent = "";
                    this.pressurePresetUnits.textContent = "HPA";
                }
                else {
                    let rounded = Math.round((baroPreset / 33.8639) * 1000) / 1000; //Converts baroPreset to inHg then rounds up to hundreths so it matches what the sim will show for pressure.
                    this.pressureSVGLeftPart.textContent = "29";
                    this.pressureSVGCenterPart.textContent = ".";
                    this.pressureSVGRightPart.textContent = "92";
                    this.pressureSVGUnits.textContent = "STD";
                    let pressureSetting = (rounded.toFixed(2).toString());
                    let leftPart = pressureSetting.slice(0,2);
                    let rightPart = pressureSetting.slice(3,5);
                    this.pressurePresetLeftPart.textContent = leftPart;
                    this.pressurePresetCenterPart.textContent = ".";
                    this.pressurePresetRightPart.textContent = rightPart;
                    this.pressurePresetUnits.textContent = "IN";
                }
            }
            else {
                this.pressureBoxGroup.setAttribute("visibility", "hidden");
                if (this.aircraft == Aircraft.A320_NEO) {
                    if (_mode == "QFE") {
                        this.pressureSVG.textContent = "QFE ";
                    }
                    else {
                        this.pressureSVG.textContent = "QNH ";
                    }
                    if (units == "millibar") {
                        this.pressureSVG.textContent += pressure.toFixed(0);
                    }
                    else {
                        this.pressureSVG.textContent += pressure.toFixed(2);
                    }
                }
                else if (this.aircraft == Aircraft.B747_8 || this.aircraft == Aircraft.AS01B) {
                    if (units == "millibar") {
                        this.pressureSVG.textContent = pressure.toFixed(0) + " HPA";
                    }
                    else {
                        this.pressureSVG.textContent = pressure.toFixed(2) + " IN";
                    }
                }
                else {
                    if (units == "millibar") {
                        this.pressureSVGLeftPart.textContent = pressure.toFixed(0);
                        this.pressureSVGCenterPart.textContent = "";
                        this.pressureSVGRightPart.textContent = "";
                        this.pressureSVGUnits.textContent = "HPA";
                        this.pressurePresetUnits.textContent = "HPA";
                    }
                    else {
                        let pressureSetting = (pressure.toFixed(2).toString());
                        let leftPart = pressureSetting.slice(0,2);
                        let rightPart = pressureSetting.slice(3,5);
                        this.pressureSVGLeftPart.textContent = leftPart;
                        this.pressureSVGCenterPart.textContent = ".";
                        this.pressureSVGRightPart.textContent = rightPart;
                        this.pressureSVGUnits.textContent = "IN";
                        this.pressurePresetUnits.textContent = "IN";
                    }
                }
            }
            this._baroPresetChanged = baroPreset;
        }
    }
    updateGraduationScrolling(_altitude) {
        let showThousandIndicator = false;
        if (this.graduations) {
            this.graduationScroller.scroll(_altitude);
            var currentVal = this.graduationScroller.firstValue;
            var currentY = this.graduationScrollPosY + this.graduationScroller.offsetY * this.graduationSpacing * (this.nbSecondaryGraduations + 1);
            for (var i = 0; i < this.totalGraduations; i++) {
                var posX = this.graduationScrollPosX;
                var posY = currentY;
                this.graduations[i].SVGLine.setAttribute("transform", "translate(" + posX.toString() + " " + posY.toString() + ")");
                if (this.graduations[i].SVGText1) {
                    var roundedVal = 0;
                    var divider = 100;
                    if (this.aircraft == Aircraft.CJ4) {
                        roundedVal = Math.floor(Math.abs(currentVal));
                        let mod = roundedVal % 1000;
                        if (mod != 0)
                            roundedVal = mod;
                    }
                    else if (this.aircraft == Aircraft.B747_8 || this.aircraft == Aircraft.AS01B) {
                        roundedVal = Math.floor(Math.abs(currentVal));
                        divider = 1000;
                    }
                    else {
                        roundedVal = Math.floor(Math.abs(currentVal) / 100);
                    }
                    if (!this.graduations[i].SVGText2) {
                        this.graduations[i].SVGText1.textContent = Utils.leadingZeros(roundedVal, 3);
                    }
                    else {
                        var integral = Math.floor(roundedVal / divider);
                        var modulo = Math.floor(roundedVal - (integral * divider));
                        if (this.aircraft == Aircraft.B747_8 || this.aircraft == Aircraft.AS01B)
                            this.graduations[i].SVGText1.textContent = (integral > 0) ? integral.toString() : "";
                        else
                            this.graduations[i].SVGText1.textContent = integral.toString();
                        if (this.aircraft == Aircraft.B747_8 || this.aircraft == Aircraft.AS01B)
                            this.graduations[i].SVGText2.textContent = Utils.leadingZeros(modulo, 3);
                        else
                            this.graduations[i].SVGText2.textContent = Utils.leadingZeros(modulo, 2);
                    }
                    this.graduations[i].SVGText1.setAttribute("transform", "translate(" + posX.toString() + " " + posY.toString() + ")");
                    if (this.graduations[i].SVGText2)
                        this.graduations[i].SVGText2.setAttribute("transform", "translate(" + posX.toString() + " " + posY.toString() + ")");
                    if (this.thousandIndicator && (currentVal % 1000) == 0) {
                        this.thousandIndicator.setAttribute("transform", "translate(" + posX.toString() + " " + posY.toString() + ")");
                        showThousandIndicator = true;
                    }
                    currentVal = this.graduationScroller.nextValue;
                }
                currentY -= this.graduationSpacing;
            }
        }
        if (this.thousandIndicator)
            this.thousandIndicator.setAttribute("visibility", (showThousandIndicator) ? "visible" : "hidden");
    }
    updateCursorScrolling(_altitude) {
        if (this.aircraft == Aircraft.CJ4 && this.isMTRSVisible()) {
            let divider = 5;
            let meters = Math.floor(_altitude / 3.28084 / divider) * divider;
            this.CursorMNumber.textContent = meters;
            this.cursorM.setAttribute("visibility", "visible");
        } else {
            this.cursorM.setAttribute("visibility", "hidden");
        }
        if (this.cursorIntegrals) {
            let hideZeros = (this.aircraft == Aircraft.A320_NEO || this.aircraft == Aircraft.CJ4) ? true : false;
            if (this.aircraft == Aircraft.CJ4) {
                this.cursorIntegrals[0].update(_altitude, 10000, (hideZeros) ? 10000 : undefined, "$"); // $ character has been modded in the font to a box shape.
                this.cursorIntegrals[1].update(_altitude, 1000, (hideZeros) ? 1000 : undefined, "$");
            }
            else {
                this.cursorIntegrals[0].update(_altitude, 10000, (hideZeros) ? 10000 : undefined);
                this.cursorIntegrals[1].update(_altitude, 1000, (hideZeros) ? 1000 : undefined);
        }
            
            this.cursorIntegrals[2].update(_altitude, 100);
        }
        if (this.cursorDecimals) {
            this.cursorDecimals.update(_altitude);
        }
        if (this.cursorSVGAltitudeLevelShape)
            this.cursorSVGAltitudeLevelShape.classList.toggle('hide', _altitude >= 10000);
    }
    valueToSvg(current, target) {
        var _top = 0;
        var _height = this.refHeight;
        let deltaValue = current - target;
        let deltaSVG = deltaValue * this.graduationSpacing * (this.nbSecondaryGraduations + 1) / this.graduationScroller.increment;
        var posY = _top + _height * 0.5 + deltaSVG;
        return posY;
    }
    updateGroundReference(currentAltitude, groundReference) {
        var currentY = this.valueToSvg(currentAltitude, groundReference);
        if (this.groundRibbonSVG && this.groundRibbonSVGShape) {
            var rectHeight = (this.refHeight - currentY - this.borderSize);
            if (rectHeight > 0) {
                this.groundRibbonSVG.setAttribute("visibility", "visible");
                this.groundRibbonSVG.setAttribute("y", currentY.toString());
                if (!this.groundRibbonHasFixedHeight)
                    this.groundRibbonSVGShape.setAttribute("height", rectHeight.toString());
            }
            else {
                this.groundRibbonSVG.setAttribute("visibility", "hidden");
            }
        }
        if (this.groundLineSVG) {
            if (currentY > 0) {
                this.groundLineSVG.setAttribute("visibility", "visible");
                this.groundLineSVG.setAttribute("y", (currentY - this.groundLineSVGHeight).toString());
            }
            else {
                this.groundLineSVG.setAttribute("visibility", "hidden");
            }
        }
    }
    getAutopilotMode() {
        if (this.aircraft == Aircraft.A320_NEO) {
            if (Simplane.getAutoPilotAltitudeManaged() && SimVar.GetSimVarValue("L:AP_CURRENT_TARGET_ALTITUDE_IS_CONSTRAINT", "number") != 0)
                return AutopilotMode.MANAGED;
            return AutopilotMode.SELECTED;
        }
        else {
            return AutopilotMode.SELECTED;
        }
    }
    updateTargetAltitude(currentAltitude, targetAltitude, baroMode) {
        let hudAltitude = 0;
        if (this.targetAltitudeIndicatorSVG) {
            var APMode = this.getAutopilotMode();
            var stdMode = (baroMode == "STD") ? true : false;
            if (this.aircraft == Aircraft.CJ4) {
                if (this.isMTRSVisible()) {
                    this.targetAltitude.setAttribute("visibility", "hidden");
                    this.targetAltitudeM.setAttribute("visibility", "visible");
                } else {
                    this.targetAltitudeM.setAttribute("visibility", "hidden");
                    this.targetAltitude.setAttribute("visibility", "visible");
                }
                if (!this.targetAltitudeChanged && targetAltitude != this.originalTargetAltitude) {
                    this.targetAltitudeChanged = true;
                    this.targetAltitudeTextSVG2.setAttribute("x", "78");
                }

                if (this.targetAltitudeChanged) {
                    if (this.isMTRSVisible()) {
                        let divider = 10;
                        var integral = Math.floor(targetAltitude / 3.28084 / divider) * divider;
                        this.targetAltitudeMTextSVG1.textContent = integral.toString();
                    } else {
                        let divider = 100;
                        let leadingZeros = 2;
                        var integral = Math.floor(targetAltitude / divider);
                        var modulo = Math.floor(targetAltitude - (integral * divider));
                        this.targetAltitudeTextSVG1.textContent = integral.toString();
                        this.targetAltitudeTextSVG2.textContent = Utils.leadingZeros(modulo, leadingZeros);
                    }
                    var offsetY = this.valueToSvg(currentAltitude, targetAltitude);
                    offsetY -= 48;
                    this.targetAltitudeIndicatorSVG.setAttribute("y", offsetY.toString());
                    this.targetAltitudeIndicatorSVG.setAttribute("visibility", "visible");
                }
            }
            else if (this.aircraft == Aircraft.B747_8 || this.aircraft == Aircraft.AS01B) {
                if (APMode != AutopilotMode.MANAGED) {
                    let divider = 100;
                    let refDelta = 275;
                    let textAlwaysVisible = false;
                    let leadingZeros = 2;
                    if (this.aircraft == Aircraft.B747_8 || this.aircraft == Aircraft.AS01B) {
                        divider = 1000;
                        refDelta = 400;
                        textAlwaysVisible = true;
                        leadingZeros = 3;
                    }
                    var integral = Math.floor(targetAltitude / divider);
                    var modulo = Math.floor(targetAltitude - (integral * divider));
                    this.targetAltitudeTextSVG1.textContent = integral.toString();
                    this.targetAltitudeTextSVG2.textContent = Utils.leadingZeros(modulo, leadingZeros);
                    // if (stdMode && targetAltitude >= 1000) {
                    //     this.targetAltitudeTextSVG1.textContent = "FL";
                    //     this.targetAltitudeTextSVG2.textContent = Math.floor(targetAltitude / 100).toString();
                    // }
                    // else {
                    //     this.targetAltitudeTextSVG1.textContent = integral.toString();
                    //     this.targetAltitudeTextSVG2.textContent = Utils.leadingZeros(modulo, leadingZeros);
                    // }
                    hudAltitude = targetAltitude;
                    let deltaAltitude = targetAltitude - currentAltitude;
                    if (deltaAltitude < -refDelta || deltaAltitude > refDelta) {
                        this.targetAltitudeTextSVG1.setAttribute("visibility", "visible");
                        this.targetAltitudeTextSVG2.setAttribute("visibility", "visible");
                        if (this.targetAltitudeBgSVG)
                            this.targetAltitudeBgSVG.setAttribute("visibility", "visible");
                        this.targetAltitudeIndicatorSVG.setAttribute("visibility", "hidden");
                    }
                    else {
                        // this.targetAltitudeTextSVG1.setAttribute("visibility", (textAlwaysVisible) ? "visible" : "hidden");
                        // this.targetAltitudeTextSVG2.setAttribute("visibility", (textAlwaysVisible) ? "visible" : "hidden");
                        // if (this.targetAltitudeBgSVG)
                        //     this.targetAltitudeBgSVG.setAttribute("visibility", (textAlwaysVisible) ? "visible" : "hidden");
                        var offsetY = this.valueToSvg(currentAltitude, targetAltitude);
                        offsetY -= 48;
                        this.targetAltitudeIndicatorSVG.setAttribute("y", offsetY.toString());
                        this.targetAltitudeIndicatorSVG.setAttribute("visibility", "visible");
                    }
                }
                else {
                    this.targetAltitudeTextSVG1.setAttribute("visibility", "hidden");
                    this.targetAltitudeTextSVG2.setAttribute("visibility", "hidden");
                    if (this.targetAltitudeBgSVG)
                        this.targetAltitudeBgSVG.setAttribute("visibility", "hidden");
                    this.targetAltitudeIndicatorSVG.setAttribute("visibility", "hidden");
                }
            }
            else if (this.aircraft == Aircraft.A320_NEO) {
                let textContent;
                if (stdMode && targetAltitude >= 1000)
                    textContent = "FL" + Math.abs(targetAltitude / 100).toString();
                else
                    textContent = targetAltitude.toFixed(0);
                let deltaAltitude = targetAltitude - currentAltitude;
                if (deltaAltitude < -650) {
                    this.targetAltitudeText.textContent = textContent;
                    this.targetAltitudeText.style.top = "720px";
                    this.targetAltitudeText.style.left = "115px";
                    diffAndSetStyle(this.targetAltitudeText, StyleProperty.display, "block");
                    this.targetAltitudeText.style.color = (APMode == AutopilotMode.SELECTED) ? "cyan" : "magenta";
                    this.targetAltitudeIndicatorSVG.setAttribute("visibility", "hidden");
                }
                else if (deltaAltitude > 650) {
                    this.targetAltitudeText.textContent = textContent;
                    this.targetAltitudeText.style.top = "-20px";
                    this.targetAltitudeText.style.left = "115px";
                    diffAndSetStyle(this.targetAltitudeText, StyleProperty.display, "block");
                    this.targetAltitudeText.style.color = (APMode == AutopilotMode.SELECTED) ? "cyan" : "magenta";
                    this.targetAltitudeIndicatorSVG.setAttribute("visibility", "hidden");
                }
                else {
                    diffAndSetStyle(this.targetAltitudeText, StyleProperty.display, "none");
                    var offsetY = this.valueToSvg(currentAltitude, targetAltitude);
                    offsetY -= 51;
                    this.targetAltitudeIndicatorSVG.setAttribute("y", offsetY.toString());
                    this.targetAltitudeIndicatorSVG.setAttribute("visibility", "visible");
                    this.targetAltitudeIndicatorSVGShape.setAttribute("stroke", (APMode == AutopilotMode.SELECTED) ? "cyan" : "magenta");
                    if (this.targetAltitudeIndicatorSVGText) {
                        if (targetAltitude >= 10)
                            this.targetAltitudeIndicatorSVGText.textContent = targetAltitude.toFixed(0);
                        else
                            this.targetAltitudeIndicatorSVGText.textContent = "100";
                        this.targetAltitudeIndicatorSVGText.setAttribute("fill", (APMode == AutopilotMode.SELECTED) ? "cyan" : "magenta");
                    }
                }
                hudAltitude = targetAltitude;
            }
        }
        if (this.hudAPAltitude != hudAltitude) {
            this.hudAPAltitude = Math.round(hudAltitude);
            SimVar.SetSimVarValue("L:HUD_AP_SELECTED_ALTITUDE", "Number", this.hudAPAltitude);
        }
    }
    updateBaroMinimums(minMode, indicatedAltitude) {
        if (this.baroMinsSVG) {
            if (minMode == 1) {
                let baroMinsSet = SimVar.GetSimVarValue("L:WT_CJ4_BARO_SET", "Number");
                let refDelta = 275;
                let deltaAltitude = baroMinsSet - indicatedAltitude;
                if (deltaAltitude < -refDelta || deltaAltitude > refDelta || baroMinsSet == 0) {
                    this.baroMinsSVG.setAttribute("visibility", "hidden");
                } else {
                    var _top = 0;
                    var _height = this.refHeight;
                    let deltaValue = indicatedAltitude - baroMinsSet;
                    let deltaSVG = deltaValue * this.graduationSpacing * (this.nbSecondaryGraduations + 1) / 100;
                    let offsetY = _top + _height * 0.5 + deltaSVG;
                    offsetY -= 48;
                    this.baroMinsSVG.setAttribute("y", offsetY.toString());
                    this.baroMinsSVG.setAttribute("visibility", "visible");
                }
            } else {
                this.baroMinsSVG.setAttribute("visibility", "hidden");
            }
        }
    }

    updateRadioMinimums(minMode, aboveGroundAltitude, indicatedAltitude, groundReference) {
        if (this.radioMinsRect) {
            if (minMode == 2) {
                let refDelta = 275;
                let radioMinsSet = SimVar.GetSimVarValue("L:WT_CJ4_RADIO_SET", "Number");
                let deltaAltitude = aboveGroundAltitude - radioMinsSet;
                if (deltaAltitude > refDelta || radioMinsSet == 0) {
                    this.radioMinsRect.setAttribute("visibility", "hidden");
                }else{
                    console.log(indicatedAltitude);
                    var radioY = this.valueToSvg(indicatedAltitude, (groundReference + radioMinsSet))
                    var groundY = this.valueToSvg(indicatedAltitude, groundReference)
                    this.radioMinsRect.setAttribute("y", (radioY).toString());
                    this.radioMinsRect.setAttribute("height", (groundY-radioY).toString());
                    this.radioMinsRect.setAttribute("visibility", "visible");
                }
            } else {
                this.radioMinsRect.setAttribute("visibility", "hidden");
            }
        }
    }

    updateAltitudeAlertFlash(deltaTime) {
        const isAlertSet = SimVar.GetSimVarValue("L:WT_CJ4_Altitude_Alerter_Active", "Number") === 1;

        if (this._lastAltitudeAlertSet !== isAlertSet && isAlertSet) {
            this._isAltitudeAlerting = isAlertSet;
            this.targetAltitudeTextSVG1.classList.add("blinking");
            this.targetAltitudeTextSVG2.classList.add("blinking");
            this.targetAltitudeIndicatorSVGShape.classList.add("blinking");
        }
        this._lastAltitudeAlertSet = isAlertSet;

        if (this._isAltitudeAlerting) {
            this._altAlertAnimationTimer -= deltaTime;
            if(this._altAlertAnimationTimer < 0 || SimVar.GetSimVarValue("L:WT_CJ4_Altitude_Alerter_Cancel", "Number") === 1){   
                this.targetAltitudeTextSVG1.classList.remove("blinking");
                this.targetAltitudeTextSVG2.classList.remove("blinking");
                this.targetAltitudeIndicatorSVGShape.classList.remove("blinking");
                this._isAltitudeAlerting = false;
                this._altAlertAnimationTimer = this.ALTALERTANIMTIME;
            }
        }
    }
}
customElements.define("jet-pfd-altimeter-indicator", Jet_PFD_AltimeterIndicator);
