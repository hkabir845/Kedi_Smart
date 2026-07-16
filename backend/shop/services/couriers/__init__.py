"""Courier provider adapters. Manual works now; Pathao/Steadfast/RedX are stubs ready for API keys."""

from __future__ import annotations

from shop.models import CourierProvider, Shipment


class CourierError(Exception):
    pass


class BaseCourier:
    code = CourierProvider.MANUAL

    def create_consignment(self, shipment: Shipment) -> dict:
        raise NotImplementedError


class ManualCourier(BaseCourier):
    code = CourierProvider.MANUAL

    def create_consignment(self, shipment: Shipment) -> dict:
        order = shipment.order
        tracking = shipment.tracking_number or f"KS-MANUAL-{order.id}-{shipment.id}"
        return {
            "consignment_id": tracking,
            "tracking_number": tracking,
            "tracking_url": None,
            "note": "Booked with own courier / hand delivery",
        }


class StubCourier(BaseCourier):
    """Placeholder until Pathao / Steadfast / RedX credentials are configured."""

    def __init__(self, code: str, label: str):
        self.code = code
        self.label = label

    def create_consignment(self, shipment: Shipment) -> dict:
        # Keep flow usable: assign a provisional tracking id; real API can replace later.
        tracking = f"{self.code.upper()}-{shipment.order_id}-{shipment.id}"
        return {
            "consignment_id": tracking,
            "tracking_number": tracking,
            "tracking_url": None,
            "note": f"{self.label} integration pending — provisional tracking assigned. Add API keys in Site Settings to enable live booking.",
        }


_REGISTRY = {
    CourierProvider.MANUAL: ManualCourier(),
    CourierProvider.PATHAO: StubCourier(CourierProvider.PATHAO, "Pathao"),
    CourierProvider.STEADFAST: StubCourier(CourierProvider.STEADFAST, "Steadfast"),
    CourierProvider.REDX: StubCourier(CourierProvider.REDX, "RedX"),
}


def get_courier(provider: str | None) -> BaseCourier:
    key = (provider or CourierProvider.MANUAL).strip().lower()
    if key not in _REGISTRY:
        raise CourierError(f"Unknown courier: {provider}")
    return _REGISTRY[key]


def list_couriers() -> list[dict]:
    return [
        {"value": CourierProvider.MANUAL, "label": "Manual / own courier", "live": True},
        {"value": CourierProvider.PATHAO, "label": "Pathao (coming soon)", "live": False},
        {"value": CourierProvider.STEADFAST, "label": "Steadfast (coming soon)", "live": False},
        {"value": CourierProvider.REDX, "label": "RedX (coming soon)", "live": False},
    ]
