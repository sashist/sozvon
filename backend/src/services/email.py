"""Сервис отправки email-уведомлений через fastapi-mail."""
import logging

from fastapi_mail import FastMail, MessageSchema, MessageType

from src.core.config import settings

logger = logging.getLogger(__name__)


_fastmail_instance = None

def _get_fastmail() -> FastMail:
    """Создать экземпляр FastMail с текущей конфигурацией (Singleton)."""
    global _fastmail_instance
    if _fastmail_instance is None:
        _fastmail_instance = FastMail(settings.mail_config)
    return _fastmail_instance


async def send_booking_created_guest(
    guest_email: str,
    guest_name: str,
    event_title: str,
    start_time: str,
    end_time: str,
    host_name: str,
    cancellation_url: str,
    is_confirmed: bool = False,
) -> None:
    """Отправить гостю подтверждение создания бронирования."""
    body = {
        "guest_name": guest_name,
        "event_title": event_title,
        "start_time": start_time,
        "end_time": end_time,
        "host_name": host_name,
        "cancellation_url": cancellation_url,
        "is_confirmed": is_confirmed,
    }
    
    message = MessageSchema(
        subject=f"Вы записались: {event_title}",
        recipients=[guest_email],
        template_body=body,
        subtype=MessageType.html,
    )
    try:
        await _get_fastmail().send_message(message, template_name="booking_created_guest.html")
        logger.info("Письмо о создании брони отправлено гостю: %s", guest_email)
    except Exception:
        logger.exception("Ошибка отправки письма гостю: %s", guest_email)


async def send_booking_created_host(
    host_email: str,
    host_name: str,
    guest_name: str,
    guest_email: str,
    event_title: str,
    start_time: str,
    end_time: str,
) -> None:
    """Отправить хосту уведомление о новой заявке на бронирование."""
    body = {
        "host_name": host_name,
        "guest_name": guest_name,
        "guest_email": guest_email,
        "event_title": event_title,
        "start_time": start_time,
        "end_time": end_time,
    }
    message = MessageSchema(
        subject=f"Новая запись: {guest_name} → {event_title}",
        recipients=[host_email],
        template_body=body,
        subtype=MessageType.html,
    )
    try:
        await _get_fastmail().send_message(message, template_name="booking_created_host.html")
        logger.info("Письмо о новой заявке отправлено хосту: %s", host_email)
    except Exception:
        logger.exception("Ошибка отправки письма хосту: %s", host_email)


async def send_booking_confirmed(
    guest_email: str,
    guest_name: str,
    event_title: str,
    start_time: str,
    end_time: str,
    host_name: str,
    cancellation_url: str,
) -> None:
    """Отправить гостю уведомление о подтверждении бронирования."""
    body = {
        "guest_name": guest_name,
        "event_title": event_title,
        "start_time": start_time,
        "end_time": end_time,
        "host_name": host_name,
        "cancellation_url": cancellation_url,
    }
    message = MessageSchema(
        subject=f"Ваша запись подтверждена: {event_title}",
        recipients=[guest_email],
        template_body=body,
        subtype=MessageType.html,
    )
    try:
        await _get_fastmail().send_message(message, template_name="booking_confirmed.html")
        logger.info("Письмо о подтверждении отправлено: %s", guest_email)
    except Exception:
        logger.exception("Ошибка отправки письма о подтверждении: %s", guest_email)


async def send_booking_cancelled(
    guest_email: str,
    guest_name: str,
    event_title: str,
    start_time: str,
    cancellation_reason: str | None = None,
) -> None:
    """Отправить гостю уведомление об отмене бронирования."""
    body = {
        "guest_name": guest_name,
        "event_title": event_title,
        "start_time": start_time,
        "cancellation_reason": cancellation_reason or "Причина не указана",
    }
    message = MessageSchema(
        subject=f"Запись отменена: {event_title}",
        recipients=[guest_email],
        template_body=body,
        subtype=MessageType.html,
    )
    try:
        await _get_fastmail().send_message(message, template_name="booking_cancelled.html")
        logger.info("Письмо об отмене отправлено: %s", guest_email)
    except Exception:
        logger.exception("Ошибка отправки письма об отмене: %s", guest_email)


async def send_booking_cancelled_host(
    host_email: str,
    host_name: str,
    guest_name: str,
    guest_email: str,
    event_title: str,
    start_time: str,
    cancellation_reason: str | None = None,
) -> None:
    """Отправить организатору уведомление об отмене записи гостем."""
    body = {
        "host_name": host_name,
        "guest_name": guest_name,
        "guest_email": guest_email,
        "event_title": event_title,
        "start_time": start_time,
        "cancellation_reason": cancellation_reason or "Причина не указана",
    }
    message = MessageSchema(
        subject=f"Гость отменил запись: {event_title}",
        recipients=[host_email],
        template_body=body,
        subtype=MessageType.html,
    )
    try:
        await _get_fastmail().send_message(
            message, template_name="booking_cancelled_host.html"
        )
        logger.info("Письмо об отмене отправлено организатору: %s", host_email)
    except Exception:
        logger.exception("Ошибка отправки письма организатору: %s", host_email)
