class WT_CitationLongitudeAirplane extends WT_PlayerAirplane {
    _createControls() {
        return new WT_CitationLongitudeControls(this);
    }

    _createReferences() {
        return new WT_CitationLongitudeReferences(this, WT_g3000_ModConfig.INSTANCE.longitudeReferences);
    }
}

class WT_CitationLongitudeControls extends WT_AirplaneControls {
}
/**
 * @enum {Number}
 */
WT_CitationLongitudeControls.FlapsPosition = {
    UP: 0,
    FLAPS_1: 1,
    FLAPS_2: 2,
    FLAPS_3: 3
}

class WT_CitationLongitudeReferences extends WT_AirplaneReferences {
    _initFromData(data) {
        super._initFromData(data);

        this._clbN1Table = new WT_InterpolatedLookupTable(data.clbN1);
        this._cruN1Table = new WT_InterpolatedLookupTable(data.cruN1);
    }

    /**
     * This airplane's maximum climb N1 table.
     * @readonly
     * @type {WT_InterpolatedLookupTable}
     */
    get clbN1Table() {
        return this._clbN1Table;
    }

    /**
     * This airplane's maximum cruise N1 table.
     * @readonly
     * @type {WT_InterpolatedLookupTable}
     */
    get cruN1Table() {
        return this._cruN1Table;
    }
}