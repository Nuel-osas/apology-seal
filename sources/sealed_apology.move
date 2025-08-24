#[allow(duplicate_alias)]
module apology_seal::sealed_apology {
    use std::string::String;
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::vec_set::{Self, VecSet};
    use sui::event;
    use sui::dynamic_field as df;
    use sui::clock::{Self, Clock};

    // ======== Constants ========
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_ALREADY_IN_ALLOWLIST: u64 = 2;
    const E_NOT_OWNER: u64 = 3;
    const E_INVALID_PREFIX: u64 = 4;
    const E_EXPIRED: u64 = 5;
    const BLOB_MARKER: u64 = 6;

    // ======== Structs ========
    
    /// Main apology object that acts as an allowlist for the sealed apology
    public struct SealedApology has key {
        id: UID,
        owner: address,
        recipients: VecSet<address>,
        message_preview: String,
        created_at: u64,
        expires_at: u64,
    }

    /// Capability for managing the sealed apology
    public struct ApologyCap has key {
        id: UID,
        apology_id: ID,
    }

    // ======== Events ========
    
    public struct ApologyCreated has copy, drop {
        apology_id: address,
        owner: address,
        recipients_count: u64,
        expires_at: u64,
    }

    public struct RecipientAdded has copy, drop {
        apology_id: address,
        recipient: address,
        added_by: address,
    }

    public struct ApologyAccessed has copy, drop {
        apology_id: address,
        accessed_by: address,
        document_id: vector<u8>,
        timestamp: u64,
    }

    public struct WalrusBlobAttached has copy, drop {
        apology_id: address,
        blob_id: String,
        attached_by: address,
    }

    // ======== Core Functions ========

    /// Creates a new sealed apology with BL and Kotaro as initial recipients
    public fun create_sealed_apology(
        bl_address: address,
        kotaro_address: address,
        message_preview: String,
        expiry_days: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ): ApologyCap {
        let sender = tx_context::sender(ctx);
        let mut recipients = vec_set::empty<address>();
        
        // Add sender and recipients to allowlist
        vec_set::insert(&mut recipients, sender);
        vec_set::insert(&mut recipients, bl_address);
        vec_set::insert(&mut recipients, kotaro_address);
        
        let current_time = clock::timestamp_ms(clock);
        let expires_at = current_time + (expiry_days * 24 * 60 * 60 * 1000);

        let apology = SealedApology {
            id: object::new(ctx),
            owner: sender,
            recipients,
            message_preview,
            created_at: current_time,
            expires_at,
        };

        let cap = ApologyCap {
            id: object::new(ctx),
            apology_id: object::id(&apology),
        };

        event::emit(ApologyCreated {
            apology_id: object::uid_to_address(&apology.id),
            owner: sender,
            recipients_count: 3, // sender + BL + Kotaro
            expires_at,
        });

        transfer::share_object(apology);
        cap
    }

    /// Entry function for creating and transferring cap to sender
    entry fun create_apology_entry(
        bl_address: address,
        kotaro_address: address,
        message_preview: String,
        expiry_days: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let cap = create_sealed_apology(
            bl_address,
            kotaro_address,
            message_preview,
            expiry_days,
            clock,
            ctx
        );
        transfer::transfer(cap, tx_context::sender(ctx));
    }

    // ======== SEAL Integration Functions ========

    /// Returns the namespace for this apology (used as prefix for document IDs)
    public fun namespace(apology: &SealedApology): vector<u8> {
        object::uid_to_bytes(&apology.id)
    }

    /// Core seal_approve function required by SEAL for access control
    /// Document ID format: [apology_id][nonce]
    entry fun seal_approve(
        document_id: vector<u8>, 
        apology: &SealedApology,
        clock: &Clock,
        ctx: &TxContext
    ) {
        let caller = tx_context::sender(ctx);
        
        // Check expiry
        let current_time = clock::timestamp_ms(clock);
        assert!(current_time < apology.expires_at, E_EXPIRED);
        
        // Verify document ID has correct prefix (apology namespace)
        let namespace = namespace(apology);
        assert!(is_prefix(namespace, document_id), E_INVALID_PREFIX);
        
        // Check if caller is in recipients list
        assert!(vec_set::contains(&apology.recipients, &caller), E_NOT_AUTHORIZED);
        
        // Emit access event
        event::emit(ApologyAccessed {
            apology_id: object::uid_to_address(&apology.id),
            accessed_by: caller,
            document_id,
            timestamp: current_time,
        });
    }

    // ======== Walrus Integration Functions ========

    /// Attach a Walrus blob ID to the apology (stores encrypted content reference)
    public fun attach_walrus_blob(
        apology: &mut SealedApology,
        cap: &ApologyCap,
        blob_id: String,
        ctx: &TxContext
    ) {
        assert!(cap.apology_id == object::id(apology), E_NOT_OWNER);
        
        // Store blob reference as dynamic field
        df::add(&mut apology.id, blob_id, BLOB_MARKER);
        
        event::emit(WalrusBlobAttached {
            apology_id: object::uid_to_address(&apology.id),
            blob_id,
            attached_by: tx_context::sender(ctx),
        });
    }

    /// Check if a blob is attached to this apology
    public fun has_blob(apology: &SealedApology, blob_id: String): bool {
        df::exists_(&apology.id, blob_id)
    }

    // ======== Management Functions ========

    /// Add a new recipient to the apology
    public fun add_recipient(
        apology: &mut SealedApology,
        cap: &ApologyCap,
        new_recipient: address,
        ctx: &TxContext
    ) {
        assert!(cap.apology_id == object::id(apology), E_NOT_OWNER);
        assert!(!vec_set::contains(&apology.recipients, &new_recipient), E_ALREADY_IN_ALLOWLIST);
        
        vec_set::insert(&mut apology.recipients, new_recipient);

        event::emit(RecipientAdded {
            apology_id: object::uid_to_address(&apology.id),
            recipient: new_recipient,
            added_by: tx_context::sender(ctx),
        });
    }

    /// Remove a recipient from the apology
    public fun remove_recipient(
        apology: &mut SealedApology,
        cap: &ApologyCap,
        recipient: address
    ) {
        assert!(cap.apology_id == object::id(apology), E_NOT_OWNER);
        vec_set::remove(&mut apology.recipients, &recipient);
    }

    /// Transfer the apology to a recipient (they become the new owner)
    public fun transfer_apology(
        apology: SealedApology,
        recipient: address,
        ctx: &TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == apology.owner, E_NOT_OWNER);
        assert!(vec_set::contains(&apology.recipients, &recipient), E_NOT_AUTHORIZED);
        
        transfer::transfer(apology, recipient);
    }

    // ======== View Functions ========

    public fun get_recipients(apology: &SealedApology): vector<address> {
        vec_set::into_keys(apology.recipients)
    }

    public fun get_owner(apology: &SealedApology): address {
        apology.owner
    }

    public fun is_authorized(apology: &SealedApology, address: address): bool {
        vec_set::contains(&apology.recipients, &address)
    }

    public fun get_expiry(apology: &SealedApology): u64 {
        apology.expires_at
    }

    public fun get_message_preview(apology: &SealedApology): String {
        apology.message_preview
    }

    // ======== Helper Functions ========

    /// Check if `prefix` is a prefix of `data`
    fun is_prefix(prefix: vector<u8>, data: vector<u8>): bool {
        let prefix_len = prefix.length();
        if (prefix_len > data.length()) {
            return false
        };
        
        let mut i = 0;
        while (i < prefix_len) {
            if (prefix[i] != data[i]) {
                return false
            };
            i = i + 1;
        };
        true
    }
}