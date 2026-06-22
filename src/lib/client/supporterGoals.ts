export type SupporterGoal = {
    name: string;
    amount: number;
};

export const SUPPORTER_GOALS = {
    serverCost: {
        name: 'supporter.goals.server_cost',
        amount: 2000000
    },
    editDesignTeam: {
        name: 'supporter.goals.edit_design_team',
        amount: 7000000
    },
    northernRoute: {
        name: 'supporter.goals.northern_route',
        amount: 13000000
    },
    centralRoute: {
        name: 'supporter.goals.central_route',
        amount: 19000000
    },
    fullRoute: {
        name: 'supporter.goals.full_route',
        amount: 27000000
    },
    hanoiOffline: {
        name: 'supporter.goals.hanoi_offline',
        amount: 32000000
    }
} satisfies Record<string, SupporterGoal>;

export const supporterGoalList = Object.values(SUPPORTER_GOALS);
