"""
EbookGenZ Core Domain Services and Business Logic
Handles cart calculations, order security guards, and download access rules.
"""

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import ClassVar


class ValidationError(Exception):
    """Raised when domain business rules are violated."""


class AccessDeniedError(Exception):
    """Raised when security or access authorization fails."""


@dataclass
class EBookItem:
    ebook_id: int
    title: str
    price: float
    category_id: int
    is_active: bool = True

    def __post_init__(self):
        if self.price < 0:
            raise ValidationError(f"E-Book price cannot be negative: {self.price}")
        if not self.title or not self.title.strip():
            raise ValidationError("E-Book title cannot be empty")


@dataclass
class CartItem:
    ebook: EBookItem
    quantity: int = 1

    def __post_init__(self):
        if self.quantity <= 0:
            raise ValidationError(f"Quantity must be greater than zero, got {self.quantity}")

    @property
    def subtotal(self) -> float:
        return round(self.ebook.price * self.quantity, 2)


@dataclass
class ShoppingCart:
    user_id: int
    items: dict[int, CartItem] = field(default_factory=dict)

    def add_item(self, ebook: EBookItem, quantity: int = 1) -> None:
        if not ebook.is_active:
            raise ValidationError(f"Cannot add inactive E-Book '{ebook.title}' to cart")
        if quantity <= 0:
            raise ValidationError("Quantity to add must be positive")

        if ebook.ebook_id in self.items:
            new_qty = self.items[ebook.ebook_id].quantity + quantity
            self.items[ebook.ebook_id] = CartItem(ebook=ebook, quantity=new_qty)
        else:
            self.items[ebook.ebook_id] = CartItem(ebook=ebook, quantity=quantity)

    def remove_item(self, ebook_id: int) -> None:
        if ebook_id in self.items:
            del self.items[ebook_id]

    def update_quantity(self, ebook_id: int, quantity: int) -> None:
        if quantity <= 0:
            self.remove_item(ebook_id)
        elif ebook_id in self.items:
            self.items[ebook_id] = CartItem(ebook=self.items[ebook_id].ebook, quantity=quantity)

    @property
    def total_amount(self) -> float:
        return round(sum(item.subtotal for item in self.items.values()), 2)

    @property
    def total_items_count(self) -> int:
        return sum(item.quantity for item in self.items.values())

    def apply_discount(self, discount_percent: float = 0.0) -> float:
        """Applies group/promotional discount if valid (0 <= percent <= 100)."""
        if discount_percent < 0 or discount_percent > 100:
            raise ValidationError(f"Invalid discount percentage: {discount_percent}")
        discount_amount = round(self.total_amount * (discount_percent / 100.0), 2)
        return round(self.total_amount - discount_amount, 2)


@dataclass
class DownloadLink:
    download_id: int
    order_id: int
    ebook_id: int
    download_token: str
    download_count: int = 0
    max_downloads: int = 5
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    def is_quota_exceeded(self) -> bool:
        return self.download_count >= self.max_downloads


class OrderSecurityGuard:
    """Controls access authorization for orders and digital file downloads."""

    VALID_STATUSES: ClassVar[set[str]] = {"pending", "confirmed", "cancelled"}

    @classmethod
    def validate_order_status(cls, status: str) -> None:
        if status.lower() not in cls.VALID_STATUSES:
            raise ValidationError(f"Invalid order status: {status}")

    @classmethod
    def can_access_download(cls, order_status: str, download_link: DownloadLink) -> bool:
        """
        Critical security requirement:
        Downloads are ONLY accessible when order_status is 'confirmed'
        AND download_count is strictly less than max_downloads.
        """
        cls.validate_order_status(order_status)

        if order_status.lower() != "confirmed":
            raise AccessDeniedError(
                f"Download locked. Order status is '{order_status}', requires 'confirmed'."
            )

        if download_link.is_quota_exceeded():
            raise AccessDeniedError(
                f"Download quota exceeded. Downloaded {download_link.download_count}/{download_link.max_downloads} times."
            )

        return True

    @classmethod
    def record_download(cls, order_status: str, download_link: DownloadLink) -> DownloadLink:
        """Records download attempt, incrementing counter only when allowed."""
        cls.can_access_download(order_status, download_link)
        download_link.download_count += 1
        return download_link
