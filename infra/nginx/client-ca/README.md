# OPSWAT client CA

Production requires `opswat-ca.pem` in this directory. It must contain only the
CA chain used to validate the MetaDefender-managed client certificates. The CA
material is a deployment secret and must not be committed.
