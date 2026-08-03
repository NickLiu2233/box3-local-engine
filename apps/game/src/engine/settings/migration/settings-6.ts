import { Settings, GuestAntiAddictSchema } from '../settings-schema';

export default function (settings:Settings) {
    settings.spamLevel = 0;
    settings.spamUntil = 0;
}