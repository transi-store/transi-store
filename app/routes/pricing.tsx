import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Heading,
  HStack,
  Icon,
  SimpleGrid,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { LuGithub, LuCloud, LuRocket, LuCheck } from "react-icons/lu";

function PricingTierTable() {
  const { t } = useTranslation();

  const tiers = [
    { range: t("pricing.saas.paid.tiers.tier1"), price: "29\u00A0\u20AC" },
    { range: t("pricing.saas.paid.tiers.tier2"), price: "49\u00A0\u20AC" },
    { range: t("pricing.saas.paid.tiers.tier3"), price: "99\u00A0\u20AC" },
    {
      range: t("pricing.saas.paid.tiers.tier4"),
      price: t("pricing.saas.paid.tiers.contactUs"),
    },
  ];

  return (
    <Box mt={4}>
      <Text fontWeight="semibold" mb={2} textStyle="sm">
        {t("pricing.saas.paid.tiers.title")}
      </Text>
      <Table.Root size="sm" variant="outline">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>
              {t("pricing.saas.paid.tiers.translations")}
            </Table.ColumnHeader>
            <Table.ColumnHeader textAlign="end">
              {t("pricing.saas.paid.tiers.pricePerMonth")}
            </Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {tiers.map((tier) => (
            <Table.Row key={tier.range}>
              <Table.Cell>{tier.range}</Table.Cell>
              <Table.Cell textAlign="end">{tier.price}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <HStack gap={2}>
      <Icon color="accent.solid" fontSize="md">
        <LuCheck />
      </Icon>
      <Text textStyle="sm">{children}</Text>
    </HStack>
  );
}

interface PricingCardProps {
  icon: React.ComponentType;
  title: string;
  price: string;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaLink: string;
  highlighted?: boolean;
  comingSoon?: boolean;
  children?: React.ReactNode;
}

function PricingCard({
  icon: IconComponent,
  title,
  price,
  description,
  features,
  ctaLabel,
  ctaLink,
  highlighted,
  comingSoon,
  children,
}: PricingCardProps) {
  const { t } = useTranslation();

  return (
    <Card.Root
      variant={highlighted ? "elevated" : "outline"}
      position="relative"
      borderWidth={highlighted ? 2 : 1}
      borderColor={highlighted ? "brand.solid" : "border"}
      transition="all 0.2s"
      _hover={{ transform: "translateY(-4px)", boxShadow: "lg" }}
    >
      {comingSoon ? (
        <Badge
          position="absolute"
          top={4}
          right={4}
          colorPalette="orange"
          variant="solid"
        >
          {t("pricing.comingSoon")}
        </Badge>
      ) : (
        <Badge
          position="absolute"
          top={4}
          right={4}
          colorPalette="green"
          variant="solid"
        >
          {t("pricing.availableNow")}
        </Badge>
      )}

      <Card.Header>
        <HStack gap={3}>
          <Icon fontSize="xl" color="brand.solid">
            <IconComponent />
          </Icon>
          <Card.Title>{title}</Card.Title>
        </HStack>
        <Box mt={3}>
          <Text textStyle="3xl" fontWeight="bold">
            {price}
          </Text>
        </Box>
        <Card.Description mt={1}>{description}</Card.Description>
      </Card.Header>

      <Card.Body>
        <VStack gap={3} align="stretch">
          {features.map((feature) => (
            <FeatureItem key={feature}>{feature}</FeatureItem>
          ))}
        </VStack>
        {children}
      </Card.Body>

      <Card.Footer>
        <Button
          asChild
          w="full"
          colorPalette="brand"
          variant={highlighted ? "solid" : "outline"}
        >
          <Link to={ctaLink}>{ctaLabel}</Link>
        </Button>
      </Card.Footer>
    </Card.Root>
  );
}

export default function PricingPage() {
  const { t } = useTranslation();

  return (
    <Container maxW="container.xl" py={{ base: 10, md: 20 }}>
      <VStack gap={4} mb={12} textAlign="center">
        <Heading as="h1" textStyle={{ base: "3xl", md: "5xl" }}>
          {t("pricing.title")}
        </Heading>
        <Text color="fg.muted" textStyle="lg" maxW="2xl">
          {t("pricing.subtitle")}
        </Text>
      </VStack>

      <SimpleGrid columns={{ base: 1, lg: 3 }} gap={8}>
        {/* Open Source */}
        <PricingCard
          icon={LuGithub}
          title={t("pricing.openSource.title")}
          price={t("pricing.openSource.price")}
          description={t("pricing.openSource.description")}
          features={[
            t("pricing.openSource.features.selfHosted"),
            t("pricing.openSource.features.unlimited"),
            t("pricing.openSource.features.basicFeatures"),
            t("pricing.openSource.features.communitySupport"),
          ]}
          ctaLabel={t("pricing.openSource.cta")}
          ctaLink="https://github.com/transi-store/transi-store#readme"
          // comingSoon
        />

        {/* SaaS Free - Highlighted */}
        <PricingCard
          icon={LuCloud}
          title={t("pricing.saas.free.title")}
          price={t("pricing.saas.free.price")}
          description={t("pricing.saas.free.description")}
          features={[
            t("pricing.saas.free.features.openSourceProjects"),
            t("pricing.saas.free.features.limitedUsers"),
            t("pricing.saas.free.features.hosted"),
            t("pricing.saas.free.features.unlimited"),
          ]}
          ctaLabel={t("pricing.saas.free.cta")}
          ctaLink="/auth/login"
        />

        {/* SaaS Pro */}
        <PricingCard
          icon={LuRocket}
          title={t("pricing.saas.paid.title")}
          price={`${t("pricing.saas.paid.from")} 29\u00A0\u20AC${t("pricing.month")}`}
          description={t("pricing.saas.paid.description")}
          features={[
            t("pricing.saas.paid.features.everything"),
            t("pricing.saas.paid.features.unlimitedUsers"),
            t("pricing.saas.paid.features.hosted"),
            t("pricing.saas.paid.features.prioritySupport"),
          ]}
          ctaLabel={t("pricing.saas.paid.cta")}
          ctaLink="/auth/login"
          highlighted
          comingSoon
        >
          <Badge colorPalette="green" variant="subtle" w="fit-content" mt={2}>
            {t("pricing.saas.paid.firstMonthFree")}
          </Badge>
          <PricingTierTable />
        </PricingCard>
      </SimpleGrid>
    </Container>
  );
}
