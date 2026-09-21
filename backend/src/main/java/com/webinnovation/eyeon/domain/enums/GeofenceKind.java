package com.webinnovation.eyeon.domain.enums;

/**
 * What a geofence means to the carer (docs/FAMILY_SAFETY_PLAN.md §3).
 * The geometry and evaluation are identical; the alarm type, severity and
 * notification wording differ.
 */
public enum GeofenceKind {
    /** Somewhere the person is supposed to be (Home, School): calm arrived/left events. */
    TRUSTED_PLACE,
    /** An area they must not leave: exits are warnings. */
    BOUNDARY
}
