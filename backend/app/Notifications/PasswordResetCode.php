<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PasswordResetCode extends Notification
{
    use Queueable;

    public function __construct(public readonly string $code)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

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
