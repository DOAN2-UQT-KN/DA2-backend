import { campaignJoiningRequestRepository } from "./campaign_joining_request.repository";
import { campaignRepository } from "../campaign.repository";
import { campaignManagerRepository } from "../campaign_manager/campaign_manager.repository";
import { GlobalStatus, JoinRequestStatus } from "../../../constants/status.enum";

export interface CreateJoinRequestRequest {
    campaignId: string;
}

export interface UpdateJoinRequestRequest {
    status: GlobalStatus._STATUS_APPROVED | GlobalStatus._STATUS_REJECTED;
}

export interface JoinRequestResponse {
    id: string;
    campaignId: string | null;
    volunteerId: string | null;
    status: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface JoinRequestDetailResponse extends JoinRequestResponse {
    campaign?: {
        id: string;
        title: string;
        status: number;
    };
}

export class CampaignJoiningRequestService {
    constructor() { }

    /**
     * Create a join request for a campaign.
     */
    async createJoinRequest(
        campaignId: string,
        volunteerId: string,
    ): Promise<JoinRequestResponse> {
        const campaign = await campaignRepository.findById(campaignId);
        if (!campaign) {
            throw new Error("Campaign not found");
        }

        const existing = await campaignJoiningRequestRepository.findExisting(
            campaignId,
            volunteerId,
        );
        if (existing) {
            throw new Error("Join request already exists");
        }

        const request = await campaignJoiningRequestRepository.createJoinRequest({
            campaignId,
            volunteerId,
        });

        return this.toResponse(request);
    }

    /**
     * Get a join request by ID.
     */
    async getJoinRequestById(
        id: string,
    ): Promise<JoinRequestDetailResponse | null> {
        const request =
            await campaignJoiningRequestRepository.findByIdWithCampaign(id);
        if (!request) return null;
        return this.toDetailResponse(request);
    }

    /**
     * Get all join requests for a campaign.
     */
    async getJoinRequestsByCampaignId(
        campaignId: string,
    ): Promise<JoinRequestResponse[]> {
        const requests =
            await campaignJoiningRequestRepository.findByCampaignId(campaignId);
        return requests.map((r) => this.toResponse(r));
    }

    /**
     * Get my join requests (volunteer perspective).
     */
    async getMyJoinRequests(
        volunteerId: string,
    ): Promise<JoinRequestDetailResponse[]> {
        const requests =
            await campaignJoiningRequestRepository.findByVolunteerId(volunteerId);
        return requests.map((r) => this.toDetailResponse(r));
    }

    /**
     * Approve or reject a join request.
     * Only campaign managers can process join requests.
     */
    async processJoinRequest(
        requestId: string,
        managerId: string,
        status: GlobalStatus._STATUS_APPROVED | GlobalStatus._STATUS_REJECTED,
    ): Promise<JoinRequestResponse> {
        const request =
            await campaignJoiningRequestRepository.findByIdWithCampaign(requestId);
        if (!request) {
            throw new Error("Join request not found");
        }

        if (!request.campaignId) {
            throw new Error("Join request has no associated campaign");
        }

        const isManager = await campaignManagerRepository.isManager(
            request.campaignId,
            managerId,
        );
        if (!isManager) {
            throw new Error("Only campaign managers can approve/reject join requests");
        }

        if (request.status !== JoinRequestStatus._STATUS_PENDING) {
            throw new Error("Join request already processed");
        }

        const updated = await campaignJoiningRequestRepository.updateStatus(
            requestId,
            status,
        );

        return this.toResponse(updated);
    }

    /**
     * Cancel a join request (by the volunteer who created it).
     */
    async cancelJoinRequest(
        requestId: string,
        volunteerId: string,
    ): Promise<void> {
        const request =
            await campaignJoiningRequestRepository.findById(requestId);
        if (!request) {
            throw new Error("Join request not found");
        }

        if (request.volunteerId !== volunteerId) {
            throw new Error("Cannot cancel another user's join request");
        }

        if (request.status !== JoinRequestStatus._STATUS_PENDING) {
            throw new Error("Can only cancel pending requests");
        }

        await campaignJoiningRequestRepository.softDelete(requestId);
    }

    /**
     * Check if a volunteer is approved for a campaign.
     */
    async isApprovedVolunteer(
        campaignId: string,
        volunteerId: string,
    ): Promise<boolean> {
        return campaignJoiningRequestRepository.isVolunteerApproved(
            campaignId,
            volunteerId,
        );
    }

    /**
     * Get all approved volunteers for a campaign.
     */
    async getApprovedVolunteers(
        campaignId: string,
    ): Promise<{ volunteerId: string | null }[]> {
        const volunteers =
            await campaignJoiningRequestRepository.getApprovedVolunteers(campaignId);
        return volunteers.map((v) => ({ volunteerId: v.volunteerId }));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private toResponse(r: any): JoinRequestResponse {
        return {
            id: r.id,
            campaignId: r.campaignId,
            volunteerId: r.volunteerId,
            status: r.status,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private toDetailResponse(r: any): JoinRequestDetailResponse {
        return {
            ...this.toResponse(r),
            campaign: r.campaign
                ? {
                    id: r.campaign.id,
                    title: r.campaign.title,
                    status: r.campaign.status,
                }
                : undefined,
        };
    }
}

export const campaignJoiningRequestService =
    new CampaignJoiningRequestService();
