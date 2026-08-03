import { Sparkles } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { boxApiClient } from '~/client/api/box-api-client';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '~/components/ui/hover-card';
import { RootState } from '~/redux/edit';
import { updateUserInfo } from '~/redux/slices/user';

export const AiCredits = React.memo(() => {
  const dispatch = useDispatch();
  const userId = useSelector((state: RootState) => state.user.id);
  const credits = useSelector((state: RootState) => state.user.credits);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(
    null,
  );
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [totalQuota, setTotalQuota] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        // The client method uses the session cookie to identify the user.
        const res = await boxApiClient.credit.getBalance();
        dispatch(updateUserInfo({ credits: res.creditBalance }));
        setSubscriptionStatus(res.subscriptionStatus);
        setSubscriptionPlan(res.subscriptionPlan);
        if (res.subscriptionEndDate) {
          setEndDate(new Date(res.subscriptionEndDate));
        }

        if (res.subscriptionPlan) {
          const plansRes = await boxApiClient.credit.getPlans();
          const currentPlan = plansRes.plans.find(
            (p) => p.name === res.subscriptionPlan,
          );
          if (currentPlan) {
            setTotalQuota(currentPlan.monthlyCredits);
          }
        }
      } catch (error) {
        console.error('Failed to fetch credits:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchBalance();
    }
  }, [userId, dispatch]);

  if (credits === undefined && !loading) return null;

  const getDaysRemaining = () => {
    if (!endDate) return null;
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const daysRemaining = getDaysRemaining();

  const content = (
    <div className="group flex items-center gap-2 px-3 py-1.5 mr-4 bg-background border border-border rounded-full cursor-pointer transition-all duration-300 hover:bg-accent hover:border-primary/50 hover:shadow-[0_0_15px_-3px_hsl(var(--primary)/0.2)]">
      {/* Icon Container with subtle glow */}
      <Sparkles size={16} className="text-yellow-500 fill-yellow-500" />

      {/* Text Balance */}
      <div className="flex flex-col leading-none">
        {/* TODO: Add i18n support in future versions */}
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold transition-colors duration-300 group-hover:text-primary/80">
          AI Credits
        </span>
        <span className="text-sm font-bold text-foreground font-mono">
          {credits?.toLocaleString() ?? '...'}
        </span>
      </div>

      {/* Add Button (Visual call to action) */}
      <div className="flex items-center justify-center w-5 h-5 ml-1 rounded-full bg-muted text-muted-foreground transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-3 h-3 stroke-3"
          aria-label="Add Credits"
        >
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </div>
    </div>
  );

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>{content}</HoverCardTrigger>
      <HoverCardContent
        className="p-3 w-56 bg-popover border border-border rounded-lg shadow-xl text-popover-foreground z-50"
        align="end"
        sideOffset={10}
      >
        <div className="flex justify-between items-center mb-2">
          {/* TODO: Add i18n support in future versions */}
          <span className="text-xs text-muted-foreground">Monthly Quota</span>
          <span className="text-xs text-foreground">
            {daysRemaining !== null
              ? `Reset in ${daysRemaining} days`
              : 'No active subscription'}
          </span>
        </div>
        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-primary rounded-full"
            style={{
              width: `${Math.min(((credits || 0) / (totalQuota || 1)) * 100, 100)}%`,
            }}
          />
        </div>
        {/* TODO: Implement purchase logic in future versions */}
        {(subscriptionPlan === 'FREE' || subscriptionStatus !== 'ACTIVE') && (
          <button
            className="w-full py-1.5 text-xs font-semibold bg-primary text-primary-foreground border-none rounded cursor-pointer transition-colors duration-200 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
            onClick={async () => {
              try {
                setLoading(true);
                // Fetch plans to find the PRO plan
                const plansRes = await boxApiClient.credit.getPlans();
                // Find a plan that is not FREE. Prefer 'PRO' if exists.
                const proPlan =
                  plansRes.plans.find((p: any) => p.name === 'PRO') ||
                  plansRes.plans.find((p: any) => p.price > 0);

                if (!proPlan) {
                  console.error('No purchasable plan found');
                  return;
                }

                const res = await boxApiClient.credit.subscribe({
                  planName: proPlan.name,
                  successUrl: window.location.href,
                });
                if (res.checkoutUrl) {
                  window.location.href = res.checkoutUrl;
                }
              } catch (error) {
                console.error('Failed to initiate purchase:', error);
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? 'Processing...' : 'Subscribe Now'}
          </button>
        )}
      </HoverCardContent>
    </HoverCard>
  );
});
