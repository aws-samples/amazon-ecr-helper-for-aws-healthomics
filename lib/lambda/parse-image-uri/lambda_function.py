import json
import re
from pprint import pprint

def is_ecr_private_repo(_registry_name):
    """
    Detect private registry in format <awsaccountid>.dkr.ecr.<awsregion>.amazonaws.com
    """
    return re.match('(?P<RegistryId>[0-9]{12})\.dkr\.ecr\.(?P<AWSRegion>[a-zA-Z0-9-]{1,})\.amazonaws\.com', _registry_name)
    
def lambda_handler(event, context):
    pprint(event)
    
    uri = event['uri']
    image_name, tag_name = uri.split(':')
    
    name_parts = image_name.split('/')
    if len(name_parts) > 1:
        registry_name = name_parts[0]
        image_name = "/".join(name_parts[1:])
    else:
        registry_name = 'dockerhub'

    with open('public_registry_properties.json', 'r') as f:
        registry_props = json.load(f)

    source_is_ecr_private = False
    source_aws_region = None
    if registry_props.get(registry_name):
        props = registry_props[registry_name]
        ecr_repo_name = "/".join([props['namespace'], image_name])
    elif (registry_info:=is_ecr_private_repo(registry_name)):
        props = { "namespace": None, "pull_through": False }
        ecr_repo_name = image_name
        source_is_ecr_private = True
        source_aws_region = registry_info.groupdict()['AWSRegion']
    else:
        # unrecognized registry, pass it through
        props = { "namespace": None, "pull_through": False }
        ecr_repo_name = "/".join(name_parts)

    return {
        "image": {
            "source_uri": uri,
            "source_registry": registry_name,
            "source_is_ecr_private": str(source_is_ecr_private).lower(),
            "source_aws_region": str(source_aws_region),
            "target_image": ":".join([ecr_repo_name, tag_name]),
            "ecr_repository": ecr_repo_name,
            "tag": tag_name,
            "pull_through_supported": str(props["pull_through"]).lower(),
        }
    }
