<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Email the six-digit verification code used by the password recovery flow. */
class PasswordResetCode extends Notification
{
    use Queueable;

    /** Keep the generated code available while building the notification email. */
    public function __construct(public readonly string $code)
    {
    }

    /** Send this notification through the configured mail channel. */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /** Build the email that explains the code and its expiration time. */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your RentWheels password reset code')
            ->greeting('Password reset requested')
            ->line('Enter this 6-digit code to reset your RentWheels password:')
            ->line($this->code)
            ->line('This code expires in 10 minutes. If you did not request this, you can ignore this email.');
    }
}
