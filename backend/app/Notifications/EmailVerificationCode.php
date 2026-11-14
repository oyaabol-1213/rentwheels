<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Email the six-digit code a new customer must enter to verify their email address. */
class EmailVerificationCode extends Notification
{
    use Queueable;

    /** Keep the generated code available while building the notification email. */
    public function __construct(public readonly string $code, public readonly int $expiresInMinutes = 5)
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
            ->subject('Your RentWheels verification code')
            ->greeting('Verify your email')
            ->line('Thanks for signing up with RentWheels. Enter this 6-digit code to verify your email address:')
            ->line($this->code)
            ->line("This code expires in {$this->expiresInMinutes} minutes. If you did not create a RentWheels account, you can ignore this email.");
    }
}
